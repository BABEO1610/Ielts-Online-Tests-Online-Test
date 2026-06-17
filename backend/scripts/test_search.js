const { listUsers } = require('../src/db/queries/users.queries');

async function test() {
  try {
    const res = await listUsers({ page: 1, limit: 10, search: 'Minh' });
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
test();
