const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        can_upload INTEGER DEFAULT 0,
        can_transfer INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        upload_count INTEGER DEFAULT 0,
        max_file_size_mb INTEGER DEFAULT 50,
        max_videos INTEGER DEFAULT 10,
        profile_picture_filename TEXT
      )
    `);

    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_upload INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_transfer INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_count INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 50'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS max_videos INTEGER DEFAULT 10'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_filename TEXT'
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploader_id INTEGER NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (uploader_id) REFERENCES users(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS polls (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          creator_id INTEGER NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          closed_at TIMESTAMPTZ,
          FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS poll_options (
            id SERIAL PRIMARY KEY,
            poll_id INTEGER NOT NULL,
            option_text TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
        )
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS poll_votes (
            id SERIAL PRIMARY KEY,
            poll_id INTEGER NOT NULL,
            option_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            voted_at TIMESTAMPTZ DEFAULT NOW(),
            FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
            FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(poll_id, user_id)
        )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )
    `);

    await client.query(`
      INSERT INTO settings (key, value) VALUES ('max_file_size_mb', '50') ON CONFLICT (key) DO NOTHING
    `);

    await client.query(`
      INSERT INTO settings (key, value) VALUES ('max_videos_per_user', '10') ON CONFLICT (key) DO NOTHING
    `);

    console.log('Database tables are successfully created or already exist.');
  } finally {
    client.release();
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  initializeDatabase,
  pool,
};
