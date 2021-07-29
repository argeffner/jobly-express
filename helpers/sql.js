const { BadRequestError } = require("../expressError");

/**
 * helper for updating qurey values and organizing data to 
 * columns
 * 
 * @param {*} dataToUpdate Object {field#: newVal, ...} 
 * @param {*} jsToSql map js data to columns name {firtName: 'first_name', age: 'age'}
 * @returns Object {SetCols, dataToUpdate}
 * example) { setCols: '"first_name"=$1, '"age"=$2',
 *            values: ['Aliya', 32] }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1, '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
