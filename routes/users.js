import express from 'express';
import User from '../models/User.js';
import { escapeRegex } from '../utils/regex.js';
import { endOfDayUTC } from '../utils/dateRange.js';

const router = express.Router();

const ALLOWED_SORT_KEYS = new Set([
  'RegistrationNumber', 'FirstName', 'LastName', 'Gender',
  'PatientEmail', 'Date_Of_Birth', 'MobileNumber', 'createdAt',
]);

const buildMatch = ({ mobile, name, fromDate, toDate }) => {
  const match = {};

  if (mobile) {
    match.MobileNumber = { $regex: escapeRegex(mobile), $options: 'i' };
  }

  if (name) {
    const safe = escapeRegex(name);
    match.$or = [
      { FirstName: { $regex: safe, $options: 'i' } },
      { LastName: { $regex: safe, $options: 'i' } },
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ['$FirstName', ' ', '$LastName'] },
            regex: safe,
            options: 'i',
          },
        },
      },
    ];
  }

  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = endOfDayUTC(toDate);
  }

  return match;
};

// Date_Of_Birth is stored as text, but not consistently: current signups
// (Signup.jsx) write "MM/DD/YYYY", while older records in the database hold
// full ISO datetime strings. A plain Mongo sort would order alphabetically,
// not chronologically — parse it into a real date first, trying the current
// format before falling back to ISO auto-detection, so both kinds sort
// correctly instead of the older records collapsing to "unsortable".
const buildSortStages = (sortKey, sortDir) => {
  const key = ALLOWED_SORT_KEYS.has(sortKey) ? sortKey : 'createdAt';
  const dir = sortDir === 'asc' ? 1 : -1;

  if (key === 'Date_Of_Birth') {
    return [
      {
        $addFields: {
          _dobSort: {
            $ifNull: [
              { $dateFromString: { dateString: '$Date_Of_Birth', format: '%m/%d/%Y', onError: null, onNull: null } },
              { $dateFromString: { dateString: '$Date_Of_Birth', onError: null, onNull: null } },
            ],
          },
        },
      },
      { $sort: { _dobSort: dir, _id: 1 } },
      { $project: { _dobSort: 0 } },
    ];
  }

  return [{ $sort: { [key]: dir, _id: 1 } }];
};

// GET /users — one page of registered users, filtered and sorted server-side
// so the client never has to hold the whole collection in memory.
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 200);
    const match = buildMatch(req.query);
    const sortStages = buildSortStages(req.query.sortKey, req.query.sortDir);

    const [result] = await User.aggregate([
      { $match: match },
      ...sortStages,
      {
        $facet: {
          documents: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    res.json({
      documents: result?.documents || [],
      total: result?.totalCount?.[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/export — every user matching the current filters, unpaginated,
// for the "Download Data" CSV button.
router.get('/export', async (req, res) => {
  try {
    const match = buildMatch(req.query);
    const sortStages = buildSortStages(req.query.sortKey, req.query.sortDir);

    const documents = await User.aggregate([{ $match: match }, ...sortStages]);

    res.json({ documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/by-reg/:registrationNumber — find user by registration number
router.get('/by-reg/:registrationNumber', async (req, res) => {
  try {
    const user = await User.findOne({ RegistrationNumber: req.params.registrationNumber });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users — signup: duplicate check + registration number generation + create
router.post('/', async (req, res) => {
  try {
    const { FirstName, LastName, PatientEmail, MobileNumber, Gender, Date_Of_Birth } = req.body;

    const patientName = `${FirstName} ${LastName}`.trim();
    const uniqueCombination = `${FirstName}|${LastName}|${PatientEmail || 'null'}|${MobileNumber || 'null'}`;

    // Duplicate check
    const existing = await User.findOne({ UniqueCombination: uniqueCombination });
    if (existing) {
      return res.status(409).json({ error: 'User already exists with the same details.' });
    }

    // Generate next registration number
    const yearLastTwo = new Date().getFullYear().toString().slice(-2);
    const latest = await User.findOne().sort({ RegistrationNumber: -1 });
    const currentCount = latest
      ? parseInt(latest.RegistrationNumber.slice(-4), 10)
      : 0;
    const registrationNumber = `JAP${yearLastTwo}${String(currentCount + 1).padStart(4, '0')}`;

    const user = await User.create({
      FirstName,
      LastName,
      PatientName: patientName,
      PatientEmail: PatientEmail || null,
      MobileNumber: MobileNumber || null,
      Gender,
      RegistrationNumber: registrationNumber,
      Date_Of_Birth: Date_Of_Birth || null,
      UniqueCombination: uniqueCombination,
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
