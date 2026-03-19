import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if running in local environment
ENVIRONMENT = os.getenv('ENVIRONMENT', 'production')

if ENVIRONMENT == 'local':
    # Local PostgreSQL configuration
    SERVER = os.getenv('DB_HOST', 'localhost')
    DATABASE = os.getenv('DB_NAME', 'aligndb')
    USERNAME = os.getenv('DB_USER', 'alignuser')
    PASSWORD = os.getenv('DB_PASSWORD', 'alignpass')
    PORT = int(os.getenv('DB_PORT', '5432'))
else:
    # Production configuration (existing)
    SERVER = '35.187.250.181'
    DATABASE = 'postgres'
    USERNAME = 'postgres'
    PASSWORD = 'lT%vbuvE.{kKd\'_;'
    PORT = 5432

class DBConnection:
    _pool = None  # Class attribute to hold the pool

    @classmethod
    async def init(cls):  # Initialize as a class method
        if cls._pool is None:
            cls._pool = await asyncpg.create_pool(
                host=SERVER,
                database=DATABASE,
                user=USERNAME,
                password=PASSWORD,
                port=PORT
            )

    async def __aenter__(self):
        if self._pool is None:
            await self.init()  # Make sure the pool is initialized
        self.conn = await self._pool.acquire()
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        await self._pool.release(self.conn)

# Ensure that you have an async generator to use as a dependency in FastAPI
async def get_db_connection():
    db_conn = DBConnection()
    async with db_conn as conn:
        yield conn


