const { validationResult } = require('express-validator');

/**
 * Run express-validator checks and return 422 if any fail.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array(),
    });
  }
  next();
}

module.exports = validate;
