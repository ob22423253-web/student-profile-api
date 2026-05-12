const { body, validationResult } = require('express-validator');

const createRules = [
  body('firstName')
    .exists({ checkFalsy: true }).withMessage('firstName is required').bail()
    .isString().withMessage('firstName must be a string').bail()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('firstName must be between 2 and 50 characters'),
  body('lastName')
    .exists({ checkFalsy: true }).withMessage('lastName is required').bail()
    .isString().withMessage('lastName must be a string').bail()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('lastName must be between 2 and 50 characters'),
  body('email')
    .exists({ checkFalsy: true }).withMessage('email is required').bail()
    .isEmail().withMessage('email must be a valid email address')
    .normalizeEmail(),
  body('age')
    .optional()
    .isInt({ min: 0, max: 150 }).withMessage('age must be an integer between 0 and 150'),
  body('course')
    .optional()
    .isString().withMessage('course must be a string').bail()
    .trim()
    .isLength({ max: 100 }).withMessage('course must be at most 100 characters'),
  body('dateRegistered')
    .optional()
    .isISO8601().withMessage('dateRegistered must be a valid ISO date')
];

const updateRules = [
  body('firstName').optional().isString().trim().isLength({ min: 2, max: 50 })
    .withMessage('firstName must be between 2 and 50 characters'),
  body('lastName').optional().isString().trim().isLength({ min: 2, max: 50 })
    .withMessage('lastName must be between 2 and 50 characters'),
  body('email').optional().isEmail().withMessage('email must be a valid email address').normalizeEmail(),
  body('age').optional().isInt({ min: 0, max: 150 })
    .withMessage('age must be an integer between 0 and 150'),
  body('course').optional().isString().trim().isLength({ max: 100 })
    .withMessage('course must be at most 100 characters'),
  body('dateRegistered').optional().isISO8601()
    .withMessage('dateRegistered must be a valid ISO date')
];

function runValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg
  }));
  return res.status(422).json({ errors });
}

module.exports = {
  validateCreate: [...createRules, runValidation],
  validateUpdate: [...updateRules, runValidation]
};
