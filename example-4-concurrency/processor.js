const debugJob = require("debug")("producer:job");
// processor.js
module.exports = (job, done) => {
  debugJob(`Starting Job ${job.id}`);
  if (job.data.xNumbers === 50) {
    throw new Error("I can't count to 50");
  }
  // Logic of the countFunction here
  let x = 0;
  const intervalID = setInterval(() => {
    if (++x === job.data.xNumbers) {
      clearInterval(intervalID);
      debugJob(`Job ${job.id} completed`);
      done(null, "Job Done");
    }
    job.progress((x / job.data.xNumbers) * 100);
  }, Math.round((job.data.ySeconds * 1000) / job.data.xNumbers));
};
