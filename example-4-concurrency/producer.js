const bull = require("bull");
const path = require("path");
const redisConfig = {
  redis: {
    port: 6379,
    host: "127.0.0.1",
    // password: "", if you are using production redis store the password with .env
  },
};

const init = () => {
  const queue = new bull("simple-queue", redisConfig); // creating the queue
  queue.process(2, path.join(__dirname, "./processor.js"));
  queue.add({ xNumbers: 20, ySeconds: 10 }); // Here you add the job
  queue.add({ xNumbers: 30, ySeconds: 10 }); // Here you add the job
  queue.add({ xNumbers: 40, ySeconds: 10 }); // Here you add the job
  queue.add({ xNumbers: 50, ySeconds: 10 }); // This Job will fail
  queue.add({ xNumbers: 60, ySeconds: 10 }); // Here you add the job
};

init();
