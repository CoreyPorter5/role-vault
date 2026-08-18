with expected_policies(table_name, policy_name, command) as (
  values
    ('profiles', 'profiles_insert_own', 'INSERT'),
    ('profiles', 'profiles_select_own', 'SELECT'),
    (
      'user_master_resumes',
      'user_master_resumes_select_own',
      'SELECT'
    )
),
actual_policies as (
  select tablename as table_name, policyname as policy_name, cmd as command
  from pg_policies
  where schemaname = 'public'
),
public_tables as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
)
select
  not exists (
    (select * from actual_policies except select * from expected_policies)
    union all
    (select * from expected_policies except select * from actual_policies)
  ) as policies_match,
  not exists (
    select 1
    from public_tables
    where not rls_enabled
  ) as all_public_tables_have_rls,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
  ) as anon_has_no_table_privileges,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and not (
        privilege_type = 'SELECT'
        and table_name in ('profiles', 'user_master_resumes')
      )
  ) as authenticated_table_privileges_are_read_only,
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type not in ('SELECT', 'INSERT')
  ) as browser_roles_have_no_update_or_delete,
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type = 'INSERT'
      and not (
        grantee = 'authenticated'
        and table_name = 'profiles'
        and column_name in ('user_id', 'email', 'first_name', 'last_name')
      )
  ) as profile_insert_is_column_limited,
  not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee in ('PUBLIC', 'anon', 'authenticated')
  ) as browser_roles_cannot_execute_public_functions,
  not has_schema_privilege('anon', 'public', 'CREATE')
    and not has_schema_privilege('authenticated', 'public', 'CREATE')
    as browser_roles_cannot_create_public_schema_objects,
  not exists (
    select 1
    from pg_default_acl defaults
    join pg_namespace namespace
      on namespace.oid = defaults.defaclnamespace
    cross join lateral aclexplode(defaults.defaclacl) privilege
    left join pg_roles grantee
      on grantee.oid = privilege.grantee
    where namespace.nspname = 'public'
      and defaults.defaclobjtype in ('r', 'S', 'f')
      and (
        privilege.grantee = 0
        or grantee.rolname in ('anon', 'authenticated')
      )
  ) as future_public_objects_are_not_auto_exposed,
  not exists (
    select 1
    from pg_proc function
    join pg_namespace namespace
      on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and not (
        'search_path=pg_catalog' = any(
          coalesce(function.proconfig, array[]::text[])
        )
      )
  ) as security_definer_functions_have_fixed_search_path;
