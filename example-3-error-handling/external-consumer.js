const debugActive = require("debug")("externalconsumer:active");
const debugProgress = require("debug")("externalconsumer:progress");
const debugCompleted = require("debug")("externalconsumer:completed");
const debugFailed = require("debug")("externalconsumer:failed");
const debugPaused = require("debug")("externalconsumer:paused");
const debugResumed = require("debug")("externalconsumer:resumed");
const debugCleaned = require("debug")("externalconsumer:cleaned");
const debugDrained = require("debug")("externalconsumer:drained");
const debugRemoved = require("debug")("externalconsumer:removed");

const bull = require("bull");
const redisConfig = {
  redis: {
    port: 6379,
    host: "127.0.0.1",
    // password: "", if you are using production redis store the password with .env
  },
};

const startListening = () => {
  const queue = new bull("simple-queue", redisConfig); // creating the queue
  queue
    .on("global:active", function (job, jobPromise) {
      // A job has started. You can use `jobPromise.cancel()`` to abort it.
      debugActive(job, jobPromise);
    })

    .on("global:progress", function (job, progress) {
      // A job's progress was updated!
      debugProgress(job, progress);
    })

    .on("global:completed", function (job, result) {
      // A job successfully completed with a `result`.
      debugCompleted(job, result);
    })

    .on("global:failed", function (job, err) {
      // A job failed with reason `err`!
      debugFailed(job, err);
    })

    .on("global:paused", function () {
      // The queue has been paused.
      debugPaused("Queue Paused");
    })

    .on("global:resumed", function (job) {
      // The queue has been resumed.
      debugResumed("Queue Resumed", job);
    })

    .on("global:cleaned", function (jobs, type) {
      // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
      // jobs, and `type` is the type of jobs cleaned.
      debugCleaned(jobs, type);
    })

    .on("global:drained", function () {
      // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
      debugDrained("Queue Drained");
    })

    .on("global:removed", function (job) {
      // A job successfully removed.
      debugRemoved(job);
    });
};

startListening();
