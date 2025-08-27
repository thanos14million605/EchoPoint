const applyFieldLimiting = (queryString) => {
  if (queryString.fields) {
    const limitedFields = queryString.fields.split(",").join(", ");
    return `${limitedFields}`;
  }

  return "*";
};

const applySorting = (queryString) => {
  if (queryString.sort) {
    const sortBy = queryString.sort.split(",").map((sortingField) => {
      const sortingFieldType = sortingField.startsWith("-")
        ? `${sortingField.slice(1)} DESC`
        : `${sortingField} ASC`;

      return sortingFieldType;
    });

    return `ORDER BY ${sortBy.join(", ")}`;
  }

  return "";
};

const applyPagination = (queryString) => {
  const page = Number(queryString.page) || 1;
  const limit = Number(queryString.limit) || 3;
  const offset = (page - 1) * limit;

  return `LIMIT ${limit} OFFSET ${offset}`;
};

const applyFiltering = (queryString) => {
  const excludedFields = ["limit", "sort", "page", "fields"];
  const queryObj = { ...queryString };

  excludedFields.forEach((excludedField) => delete queryObj[excludedField]);

  const filters = [];
  const values = [];
  let i = 1;

  for (const key in queryObj) {
    if (key.includes("[")) {
      // Example: price[gte]=100
      const [field, operator] = key.replace("]", "").split("[");
      let sqlOperator;

      switch (operator) {
        case "gte":
          sqlOperator = ">=";
          break;
        case "gt":
          sqlOperator = ">";
          break;
        case "lte":
          sqlOperator = "<=";
          break;
        case "lt":
          sqlOperator = "<";
          break;
        case "ne":
          sqlOperator = "!=";
          break;
        default:
          sqlOperator = "=";
      }

      filters.push(`${field} ${sqlOperator} $${i}`);
      values.push(isNaN(queryObj[key]) ? queryObj[key] : Number(queryObj[key]));
      i++;
    } else {
      filters.push(`${key} = $${i}`);
      values.push(isNaN(queryObj[key]) ? queryObj[key] : Number(queryObj[key]));
      i++;
    }
  }

  return {
    whereByClause: filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "",
    values,
  };
};

export default {
  applyFieldLimiting,
  applyFiltering,
  applySorting,
  applyPagination,
};
