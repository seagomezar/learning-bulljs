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
    console.log(`Starting Job ${job.id}`);
    await count(job.data.xNumbers, job.data.ySeconds);
    console.log(`Job ${job.id} completed`);
    done(null, "Job done ");
  });

  queue.add({ xNumbers: 10, ySeconds: 10 }, { retry: 10, delay: 20001 }); // Here you add the job
  queue.add({ xNumbers: 20, ySeconds: 5 }, { retry: 2, delay: 10000 }); // And other

  /* Compare the approach
  count(10, 10);
  count(20, 5);
  */
};

const count = (xNumbers, ySeconds) => {
  return new Promise((accept) => {
    let x = 0;
    const intervalID = setInterval(() => {
      if (++x === xNumbers) {
        clearInterval(intervalID);
        accept("Count finished");
      }
      console.log(x);
    }, (ySeconds * 1000) / xNumbers);
  });
};

init();
