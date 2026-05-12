const express = require('express');
const {
  createStudent,
  listStudents,
  getStudentStats,
  getStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');
const { validateCreate, validateUpdate } = require('../middleware/validateStudent');

const router = express.Router();

router.get('/stats', getStudentStats);

router.route('/')
  .get(listStudents)
  .post(validateCreate, createStudent);

router.route('/:id')
  .get(getStudent)
  .put(validateUpdate, updateStudent)
  .delete(deleteStudent);

module.exports = router;
