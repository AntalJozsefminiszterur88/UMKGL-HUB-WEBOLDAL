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
        can_view_clips INTEGER DEFAULT 0,
        can_view_archive INTEGER DEFAULT 0,
        can_edit_archive INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        upload_count INTEGER DEFAULT 0,
        max_file_size_mb INTEGER DEFAULT 50,
        max_videos INTEGER DEFAULT 10,
        profile_picture_filename TEXT,
        preferred_quality TEXT DEFAULT '1080p'
      )
    `);

    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_upload INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_transfer INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_clips INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_archive INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_edit_archive INTEGER DEFAULT 0'
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
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_quality TEXT DEFAULT '1080p'"
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploader_id INTEGER NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        has_720p INTEGER DEFAULT 0,
        has_1080p INTEGER DEFAULT 0,
        has_1440p INTEGER DEFAULT 0,
        original_quality TEXT,
        processing_status TEXT DEFAULT 'done',
        FOREIGN KEY (uploader_id) REFERENCES users(id)
      )
    `);

    await client.query(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS content_created_at TIMESTAMPTZ DEFAULT NOW()'
    );
    await client.query(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS file_hash TEXT UNIQUE'
    );
    await client.query(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_filename TEXT'
    );
    await client.query(
      'ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_original_name_key'
    );
    await client.query(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS has_720p INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS has_1080p INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS has_1440p INTEGER DEFAULT 0'
    );
    await client.query(
      "ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'done'"
    );
    await client.query(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS original_quality TEXT'
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS video_tags (
        video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (video_id, tag_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS archive_videos (
        id SERIAL PRIMARY KEY,
        folder_name TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploader_id INTEGER NOT NULL REFERENCES users(id),
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        content_created_at TIMESTAMPTZ DEFAULT NOW(),
        thumbnail_filename TEXT,
        has_720p INTEGER DEFAULT 0,
        original_quality TEXT,
        processing_status TEXT DEFAULT 'done',
        processing_error TEXT
      )
    `);

    await client.query(
      'ALTER TABLE archive_videos ADD COLUMN IF NOT EXISTS folder_name TEXT'
    );
    await client.query(
      'ALTER TABLE archive_videos ADD COLUMN IF NOT EXISTS content_created_at TIMESTAMPTZ DEFAULT NOW()'
    );
    await client.query(
      'ALTER TABLE archive_videos ADD COLUMN IF NOT EXISTS thumbnail_filename TEXT'
    );
    await client.query(
      'ALTER TABLE archive_videos ADD COLUMN IF NOT EXISTS has_720p INTEGER DEFAULT 0'
    );
    await client.query(
      'ALTER TABLE archive_videos ADD COLUMN IF NOT EXISTS original_quality TEXT'
    );
    await client.query(
      "ALTER TABLE archive_videos ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'done'"
    );
    await client.query(
      'ALTER TABLE archive_videos ADD COLUMN IF NOT EXISTS processing_error TEXT'
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS archive_tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS archive_video_tags (
        video_id INTEGER NOT NULL REFERENCES archive_videos(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES archive_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (video_id, tag_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS academy_articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        summary TEXT,
        content TEXT,
        keywords TEXT,
        inline_images JSONB DEFAULT '[]',
        cover_filename TEXT,
        pdf_filename TEXT,
        pdf_original_filename TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS subtitle TEXT'
    );
    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS summary TEXT'
    );
    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS content TEXT'
    );
    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS keywords TEXT'
    );
    await client.query(
      "ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS inline_images JSONB DEFAULT '[]'"
    );
    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS cover_filename TEXT'
    );
    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS pdf_filename TEXT'
    );
    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS pdf_original_filename TEXT'
    );
    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()'
    );
    await client.query(
      'ALTER TABLE academy_articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()'
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS academy_tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(
      'ALTER TABLE academy_tags ADD COLUMN IF NOT EXISTS color TEXT'
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS academy_article_tags (
        article_id INTEGER NOT NULL REFERENCES academy_articles(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES academy_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (article_id, tag_id)
      )
    `);

    const academySeedResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM academy_articles'
    );
    const academySeedCount = Number(academySeedResult.rows?.[0]?.count || 0);

    if (academySeedCount === 0) {
      const seedTags = [
        { name: 'Politológia', color: '#FF6B6B' },
        { name: 'Médiakutatás', color: '#3BA55C' },
      ];

      const tagIdByName = {};

      for (const tag of seedTags) {
        const insertTag = await client.query(
          'INSERT INTO academy_tags (name, color) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
          [tag.name, tag.color]
        );
        let tagId = insertTag.rows?.[0]?.id;
        if (!tagId) {
          const existing = await client.query(
            'SELECT id FROM academy_tags WHERE name = $1',
            [tag.name]
          );
          tagId = existing.rows?.[0]?.id;
        }
        if (tagId) {
          tagIdByName[tag.name] = tagId;
        }
      }

      const seedArticles = [
        {
          title: 'A Gulyás-Magyar Interakció: Politikai kríziskommunikáció elemzése',
          subtitle: 'Hogyan hatott a kegyelmi botrány a kormányzati kommunikációra?',
          summary:
            'Részletes vizsgálata a 2024. februári "kegyelmi botrány" utáni eseményeknek. A tanulmány feltárja az összefüggést Gulyás Gergely miniszter váratlan gerincműtétje és Magyar Péter Partizán-interjúja között, elemzi a "diplomáciai betegség" elméletét és a lojalitás vs. barátság kérdéskörét a NER-ben.',
          content: `
<div class="highlight-box">
  <strong>Kutatási Kérdés:</strong> Volt-e ok-okozati összefüggés Gulyás Gergely eltűnése és barátja, Magyar Péter színrelépése között? A "diplomáciai betegség" elméletének vizsgálata.
</div>

<h2>1. Bevezetés: A Februári Bomba</h2>
<p>
  2024. február 11-én Magyar Péter, Varga Judit volt férje, a Partizán műsorában éles kritikát fogalmazott meg a kormány belső körei ellen. Ez az esemény ("kegyelmi botrány") dominálta a közbeszédet. Ezzel párhuzamosan Gulyás Gergely miniszter váratlanul eltűnt a nyilvánosság elől.
</p>

<h2>2. A Műtét Rejtélye</h2>
<p>
  Február végén a Miniszterelnökség bejelentette: Gulyás sürgősségi gerincműtéten esett át. Saját elmondása szerint <em>"a műtét sikeres volt, de utána újra kellett tanulnom járni"</em>. Bár a közvélemény szkeptikus volt, és sokan azt hitték, hogy a miniszter csak kerüli a kényes kérdéseket barátja árulásával kapcsolatban, a rehabilitáció hossza és a fizikai állapot (járókeret) valós orvosi beavatkozást igazol.
</p>

<table class="data-table">
  <thead>
    <tr>
      <th>Esemény</th>
      <th>Időpont</th>
      <th>Jelentőség</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Magyar Péter Interjú</td>
      <td>Február 11.</td>
      <td>A botrány kirobbanása</td>
    </tr>
    <tr>
      <td>Gulyás Műtétje</td>
      <td>Február 25.</td>
      <td>Kivonulás a nyilvánosságból</td>
    </tr>
    <tr>
      <td>Visszatérés</td>
      <td>Április 11.</td>
      <td>Elhatárolódás a baráttól</td>
    </tr>
  </tbody>
</table>

<h2>3. Konklúzió</h2>
<p>
  Gulyás Gergely lojalitása a kormány felé megkérdőjelezhetetlen maradt. Visszatérésekor egyértelművé tette: bár 20 éves barátság fűzte Magyarhoz, az általa tett lépéseket (különösen a felesége titkos rögzítését) elfogadhatatlannak tartja. A "kommunikációs karantén" részben tudatos lehetett, de az egészségügyi ok volt a döntő tényező.
</p>
`.trim(),
          keywords: 'NER, Válság, Kommunikáció',
          created_at: '2024-03-28',
          tags: ['Politológia'],
        },
        {
          title: 'Online Stigma és Dezinformáció: A "DoggyAndi-jelenség"',
          subtitle: '',
          summary:
            'Hogyan terjednek egészségügyi álhírek a gaming közösségekben? Ez a kutatás a Tabár-Szabó Andrea (DoggyAndi) körül kialakult HIV/AIDS pletykákat vizsgálja tudományos módszertannal, cáfolva azokat a nyilvános adatok és az orvostudomány tényei alapján.',
          content: `
<div class="highlight-box" style="border-color: var(--success); background: rgba(59, 165, 92, 0.1);">
  <strong>Összefoglaló:</strong> A kutatás célja a "DoggyAndi" nevű tartalomgyártót érintő HIV/AIDS pletykák hitelességének vizsgálata volt. Az eredmények alapján a vádak alaptalanok.
</div>

<h2>A Problémafelvetés</h2>
<p>
  Az internetes közösségekben, különösen a fiatalabb (Z generációs) demográfiai csoportokban gyakori a dezinformáció gyors terjedése. A vizsgált esetben egy népszerű Minecraft videós magánéletével kapcsolatos súlyos egészségügyi spekulációk (AIDS) jelentek meg fórumokon (pl. Gyakorikérdések.hu), különösen a 2020-as párkapcsolati szakítása után.
</p>

<h2>Tényellenőrzés</h2>
<p>
  A kutatás során nem találtunk semmilyen hiteles orvosi dokumentációt vagy nyilatkozatot, ami alátámasztaná a pletykákat. Ellenkezőleg:
</p>
<ul>
  <li>Az alany aktív életmódot folytat (utazások, nyilvános szereplések).</li>
  <li>A HIV nem diagnosztizálható videós tartalmak alapján.</li>
  <li>A pletykák forrása anonim és gyakran rosszindulatú kommentekre vezethető vissza.</li>
</ul>

<h2>Etikai vonatkozások</h2>
<p>
  Fontos hangsúlyozni a GDPR és a magánszféra védelmének elveit. Egy közszereplőnek sem kötelessége nyilvánosságra hozni az egészségügyi állapotát, különösen stigmatizáló vádakkal szemben. A tudományos konszenzus szerint az ilyen pletykák terjesztése káros és etikátlan.
</p>
`.trim(),
          keywords: '',
          created_at: '2025-06-20',
          tags: ['Médiakutatás'],
        },
      ];

      for (const article of seedArticles) {
        const insertArticle = await client.query(
          `INSERT INTO academy_articles
            (title, subtitle, summary, content, keywords, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6)
           RETURNING id`,
          [
            article.title,
            article.subtitle || null,
            article.summary || null,
            article.content || null,
            article.keywords || null,
            article.created_at,
          ]
        );

        const articleId = insertArticle.rows?.[0]?.id;
        if (!articleId) {
          continue;
        }

        for (const tagName of article.tags || []) {
          const tagId = tagIdByName[tagName];
          if (!tagId) {
            continue;
          }
          await client.query(
            'INSERT INTO academy_article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [articleId, tagId]
          );
        }
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id SERIAL PRIMARY KEY,
        name TEXT,
        description TEXT,
        image_filename TEXT,
        file_filename TEXT,
        original_filename TEXT,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS downloads_log (
        id SERIAL PRIMARY KEY,
        program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE,
        ip_address TEXT,
        downloaded_at TIMESTAMPTZ DEFAULT NOW()
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
