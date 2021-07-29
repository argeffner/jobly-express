const {sqlForPartialUpdate} = require('./sql');

describe('sqlForPartialUpdate', () => {
  test('1 field: 1 val return', ()=> {
    const res = sqlForPartialUpdate(
      {field1: 'val1'}, 
      {field1: 'field1', field2: 'field2'}
    );
    expect(res).toEqual({
      setCols: '\"field1\"=$1',
      values: ['val1'],
    });
  });

  test('2 fields: 2 vals return', () => {
    const res = sqlForPartialUpdate(
      {field1: 'val1', field2: 'val2'},
      {field1: 'field1'}
    );
    expect(res).toEqual({
        setCols: '\"field1\"=$1, \"field2\"=$2',
        values: ['val1, val2']
    });
  });
});