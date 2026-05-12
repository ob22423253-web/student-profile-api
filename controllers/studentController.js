const mongoose = require('mongoose');
const Student = require('../models/Student');

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const requestedLimit = parseInt(query.limit, 10) || 10;
  const limit = Math.min(Math.max(requestedLimit, 1), 100);
  return { page, limit };
}

function buildFilter(query) {
  const filter = {};
  if (query.q) {
    const safe = String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');
    filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
  }
  if (query.course) {
    filter.course = new RegExp(`^${String(query.course).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  return filter;
}

async function createStudent(req, res, next) {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (err) {
    next(err);
  }
}

async function listStudents(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query);
    const filter = buildFilter(req.query);
    const [data, total] = await Promise.all([
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Student.countDocuments(filter)
    ]);
    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getStudentStats(req, res, next) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, byCourseAgg, recentlyRegistered] = await Promise.all([
      Student.countDocuments(),
      Student.aggregate([
        { $match: { course: { $ne: null, $exists: true } } },
        { $group: { _id: '$course', count: { $sum: 1 } } },
        { $project: { _id: 0, course: '$_id', count: 1 } },
        { $sort: { count: -1, course: 1 } }
      ]),
      Student.countDocuments({ dateRegistered: { $gte: thirtyDaysAgo } })
    ]);

    res.json({
      total,
      byCourse: byCourseAgg,
      recentlyRegistered
    });
  } catch (err) {
    next(err);
  }
}

async function getStudent(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: { message: 'Invalid student id', statusCode: 400 }
      });
    }
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        error: { message: 'Student not found', statusCode: 404 }
      });
    }
    res.json(student);
  } catch (err) {
    next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: { message: 'Invalid student id', statusCode: 400 }
      });
    }
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!student) {
      return res.status(404).json({
        error: { message: 'Student not found', statusCode: 404 }
      });
    }
    res.json(student);
  } catch (err) {
    next(err);
  }
}

async function deleteStudent(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: { message: 'Invalid student id', statusCode: 400 }
      });
    }
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({
        error: { message: 'Student not found', statusCode: 404 }
      });
    }
    res.json({ message: 'Student deleted', id: req.params.id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStudent,
  listStudents,
  getStudentStats,
  getStudent,
  updateStudent,
  deleteStudent
};
