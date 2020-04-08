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
    // Logic of the countFunction here
    let x = 0;
    const intervalID = setInterval(() => {
      if (++x === job.data.xNumbers) {
        clearInterval(intervalID);
        console.log(`Job ${job.id} completed`);
        done(null, "Job done ");
      }
      job.progress((x / job.data.xNumbers) * 100);
      console.log(x);
    }, (job.data.ySeconds * 1000) / job.data.xNumbers);
  });

  queue.add({ xNumbers: 10, ySeconds: 10 }, { retry: 10, delay: 10000 }); // Here you add the job
  queue.add({ xNumbers: 20, ySeconds: 5 }, { retry: 2, delay: 10000 }); // And other
};

init();
