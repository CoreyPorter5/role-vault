// Configures your PostgreSQL connection pool

package db

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func InitDB() {
	godotenv.Load()
	conn, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}

	defer conn.Close()

	fmt.Println("HEY")
	var title string
	err = conn.QueryRow(context.Background(), "SELECT job_title FROM jobs WHERE id = 'b5e3dabb-a859-4046-a449-9fdd4eaf6bd3'").Scan(&title)
	if err == nil {
		fmt.Println("Queryed the db and got: ", title)

	} else {
		log.Fatal("Failed: ", err)
	}

}
