const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const {AppError} = require('../errors');

const ajv = new Ajv({ allErrors: true, useDefaults: true, multipleOfPrecision: 2 });
addFormats(ajv);

exports.compile = (schema) => {
  const validate = ajv.compile(schema);

  return (body) => {
    if (validate(body)) return body;

    const errors = validate.errors;

    // Contract: unknown body fields are rejected with 400
    const unknown = errors
      .filter((e) => e.keyword === 'additionalProperties')
      .map((e) => e.params.additionalProperty);
    if (unknown.length) {
      throw new AppError(400, 'MALFORMED_REQUEST', 'Unknown field(s) in body', unknown);
    }

    const details = errors.map((e) => ({
      field: e.params.missingProperty ?? e.instancePath.replace(/^\//, '').replace(/\//g, '.'),
      message: e.message,
    }));
    throw new AppError(422, 'VALIDATION_FAILED', 'One or more fields are invalid', details);
  };
};