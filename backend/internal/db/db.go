// Configures your PostgreSQL connection pool

package db

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	storage_go "github.com/supabase-community/storage-go"
)

var Conn *pgxpool.Pool
var StorageClient *storage_go.Client

func InitDB() {
	var err error
	Conn, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	fmt.Println("Success connecting to db")

	StorageClient = storage_go.NewClient(os.Getenv("SUPABASE_STORAGE_URL"), os.Getenv("SUPABASE_SECRET_API_KEY"), nil)
}
