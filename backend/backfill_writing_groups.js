const { pool } = require('./src/db/pool');
const { v4: uuidv4 } = require('uuid');

async function backfill() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Tìm các bài nộp viết chưa có writing_group_id
    const res = await client.query(`
      SELECT id, user_id, test_id, submitted_at
      FROM writing_submissions
      WHERE writing_group_id IS NULL
      ORDER BY user_id, test_id, submitted_at ASC
    `);

    // Gộp nhóm (grouping) theo user_id, test_id và khoảng thời gian (cùng 1 đợt thi, ví dụ cách nhau dưới 1 giờ)
    const groups = [];
    for (const row of res.rows) {
      const submittedAt = new Date(row.submitted_at).getTime();
      let foundGroup = false;

      // Tìm xem có group nào khớp với user_id và test_id và thời gian nộp cách nhau dưới 60 phút
      for (const group of groups) {
        if (group.user_id === row.user_id && group.test_id === row.test_id) {
          const groupTime = new Date(group.first_submitted_at).getTime();
          if (Math.abs(submittedAt - groupTime) < 60 * 60 * 1000) {
            group.ids.push(row.id);
            foundGroup = true;
            break;
          }
        }
      }

      if (!foundGroup) {
        groups.push({
          group_id: uuidv4(),
          user_id: row.user_id,
          test_id: row.test_id,
          first_submitted_at: row.submitted_at,
          ids: [row.id]
        });
      }
    }

    // Cập nhật từng group
    for (const group of groups) {
      for (const id of group.ids) {
        await client.query(
          'UPDATE writing_submissions SET writing_group_id = $1 WHERE id = $2',
          [group.group_id, id]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Backfilled ${groups.length} writing groups for ${res.rows.length} submissions.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

backfill();
