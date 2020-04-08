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

const init = () => {
  const queue = new bull("simple-queue", redisConfig); // creating the queue
  queue.process(async (job, done) => {
    debugJob(`Starting Job ${job.id}`);
    // Logic of the countFunction here
    let x = 0;
    const intervalID = setInterval(() => {
      debugJob(x);
      if (++x === job.data.xNumbers) {
        clearInterval(intervalID);
        debugJob(`Job ${job.id} completed`);
        done(null, "Job done ");
      } else if (job.data.xNumbers / 2 > x) {
        // lets put arbitrarily an error
        done(new Error("Something unexpected happened"));
        clearInterval(intervalID);
        debugJob(`Job ${job.id} error sent`);
      }
      job.progress((x / job.data.xNumbers) * 100);
    }, Math.round((job.data.ySeconds * 1000) / job.data.xNumbers));
  });

  queue.add({ xNumbers: 3, ySeconds: 10 }, { delay: 2000 }); // Here you add the job
};

init();
