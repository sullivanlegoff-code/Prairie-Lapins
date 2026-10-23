// The actual normal-game new course, using the same touch audit as the guided course.
process.env.PRAIRIE_START_NORMAL_ONLY='1';
require('./guided-start-public-check.cjs');
