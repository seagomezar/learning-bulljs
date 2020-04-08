const debugActive = require("debug")("producer:active");
const debugProgress = require("debug")("producer:progress");
const debugCompleted = require("debug")("producer:completed");
const debugFailed = require("debug")("producer:failed");
const debugPaused = require("debug")("producer:paused");
const debugResumed = require("debug")("producer:resumed");
const debugCleaned = require("debug")("producer:cleaned");
const debugDrained = require("debug")("producer:drained");
const debugRemoved = require("debug")("producer:removed");
const debugJob = require("debug")("producer:job");

const bull = require("bull");
const redisConfig = {
  redis: {
    port: 6379,
    host: "127.0.0.1",
    // password: "", if you are using production redis store the password with .env
  },
};

const startListening = () => {
  queue
    .on("active", function (job, jobPromise) {
      // A job has started. You can use `jobPromise.cancel()`` to abort it.
      debugActive(job, jobPromise);
    })

    .on("progress", function (job, progress) {
      // A job's progress was updated!
      debugProgress(job, progress);
    })

    .on("completed", function (job, result) {
      // A job successfully completed with a `result`.
      debugCompleted(job, result);
    })

    .on("failed", function (job, err) {
      // A job failed with reason `err`!
      debugFailed(job, err);
    })

    .on("paused", function () {
      // The queue has been paused.
      debugPaused("Queue Paused");
    })

    .on("resumed", function (job) {
      // The queue has been resumed.
      debugResumed("Queue Resumed", job);
    })

    .on("cleaned", function (jobs, type) {
      // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
      // jobs, and `type` is the type of jobs cleaned.
      debugCleaned(jobs, type);
    })

    .on("drained", function () {
      // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
      debugDrained("Queue Drained");
    })

    .on("removed", function (job) {
      // A job successfully removed.
      debugRemoved(job);
    });
};

const init = () => {
  const queue = new bull("simple-queue", redisConfig); // creating the queue
  queue.process(async (job, done) => {
    debugJob(`Starting Job ${job.id}`);
    // Logic of the countFunction here
    let x = 0;
    const intervalID = setInterval(() => {
      debug(x);
      if (++x === job.data.xNumbers) {
        clearInterval(intervalID);
        debugJob(`Job ${job.id} completed`);
        done(null, "Job done ");
      }
      job.progress((x / job.data.xNumbers) * 100);
    }, Math.round((job.data.ySeconds * 1000) / job.data.xNumbers));
  });

  queue.add({ xNumbers: 3, ySeconds: 10 }, { delay: 4000 }); // Here you add the job
};

init();
//startListening();
