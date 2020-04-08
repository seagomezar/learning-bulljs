**Practica BullJS**

Es común que nos encontremos algún proyecto en nuestra vida de programador con requerimientos muy puntuales en cuanto a funciones y su ejecución. Por ejemplo usar funciones en javascript que deban ejecutarse una cantidad específica de veces, poder volver a ejecutarse en caso de fallar o una o varias veces y priorizar estas funciones para saber cual ejecutar primero, entre muchas otras cosas. Es allí donde muchos sistemas de manejo de colas para NodeJS empiezan a tomar importancia. Sin embargo en este artículo vamos a hablar de una en particular llamada BullJS.

BullJS es una librería soportada por node.js para estos escenarios, pero que además persiste la información en un base de datos en Redis. Pero eso no es todo, permite paralelismo de tareas, notificaciones entre productores y consumidores y seguimiento de progreso de tareas entre otros.

El proyecto BullJS se define a sí mismo como: “El sistema de colas más rapido y confiable basado en redis para NodeJS, cuidadosamente escrito para estabilidad, solidez y atomicidad”.

Para instalar BullJS necesitas tener NodeJS instalado y además ejecutar el comando:

```
npm install bull
```

Como mencionamos arriba, bull necesita redis-database, ya que es el lugar donde se almacena y se administran los “jobs” y los messages. Si tu tienes docker instalado en tu máquina, podemos ejecutar:

```
docker run — name my-redis-container -p 6379:6379 -d redis
```

Esto inicia una base de datos local de redis que estará ejecutandose en 127.0.0.1:6379

Un ejemplo para un “job” (Porque verás en BullJS se denomina job a cualquier tarea) podría ser algo como “7 días después de que un se suscriba a nuestro newsletter queremos enviarle un email que contenga un enlace para puntuar su experiencia de subscripción en nuestro sitio”.

BullJS tiene dos elementos principales que definen todo el ecosistema para trabajar, el primero son las colas o “Queues” y el segundo las tareas “Jobs”. Revisemos primero las tareas:

**Queues en BullJS**

Una cola es un objeto de javascript que puede producir y consumir jobs. Para este ejemplo vamos nombrar una newsLetterMail, pero tu puedes ponerle el nombre que quieras. Cuando creamos una instancia de una cola debemos especificarle el host y el puerto de tu base de datos de Redis ya que el default es 127.0.0.1:6379. Veamos entonces cómo sería esto:

```
import Queue from 'bull'

const newsLetterMailQueue = new Queue('newsLetterMail', {
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
})
```

Nota que hemos importado Bull con alias de Queue y hemos creado la Cola pasándole dos argumentos, el nombre y un objeto con la configuración de redis. Eso es todo con las colas pasemos ahora a los…

**Jobs en BullJS**

Ahora que tenemos una Queue, creemos nuestro primer Job. Para esto vamos a pasar un objeto con datos que contenga la dirección de email a la cual queremos enviar el email, adicionalmente vamos a pasar algunas opciones. En este ejemplo queremos procesar el job 7 días después de haber sido creado. También si el job falla se va a intentar ejecutar tres veces:

```
const data = {
  email: 'foo@bar.com'
}

const options = {
  delay: 86400000,
  attempts: 3
}

newsLetterMailQueue.add(data, options)
```

Para añadir un job a una queue utilizamos la función add que viene en el objeto de javascript que nos devuelve la creación de la cola, ésto hace que BullJS añada el job a la base de datos con las opciones que hemos especificado.

**Procesando un Job**

Para procesar un Job, necesitamos especificar una función que pueda ser llamada por cada job en una cola, sin importar cuantos sean. Esta función se llama “process” y hace parte del objeto de la queue que hemos definido:

```
newsLetterMailQueue.process(async job => {
  await sendNewsLetterMailTo(job.data.email)
})
```

Hemos extraído la propiedad email del Job mediante job.data y luego llamamos una función que se encarga de enviar el correo. Si esta función llega a fallar por algún error de javascript BullJS controlará dicho error e intentará ejectuarlo de nuevo hasta máximo 3 veces o las veces que le hayamos especificado en las opciones del Job.

**Completando un Job**

Ahora imaginemos que la ejecución ha finalizado, ¿Cómo podemos saber esto? O mejor aún ¿Como conocemos si algo falló?. Es ahí donde cabe anotar que cada vez que finalicé el proceso de un Job, necesitamos o bien resolver una promesa o bien ejecutar un callback, veamos estas dos opciones:

```
newsLetterMailQueue.process(async (job, done) => {
  await sendNewsLetterMailTo(job.data.email);
  done(null, {"message"; "Email sent"})
})
```

En este ejemplo anterior el callback done, recibe dos parámetros error y resultado, como todo salió bien hemos enviado el error en null y en el resultado un objeto con el mensaje de éxito.

```
newsLetterMailQueue.process(async (job) => {
  await sendNewsLetterMailTo(job.data.email);
  return Promise.resolve({"message"; "Email sent"})
})
```

Ahora con promesas tenemos la opción de retornar una promesa resuelta o fallida en este caso como queremos completar el job sin errores y completo retornamos el resultado dentro del resolve de nuestra promesa a retornar.

Es posible notificar sobre el progreso de un Job mediate job.progress, ya que si tenemos alguna otra entidad escuchando por Jobs en una queue va a ser una buena señal de notificación entre ambos sistemas.

**Manejando errores en un Job**

Una particularidad de Bull es que dentro del process de una queue, cada vez que se obtenga un error se va a finalizar el proceso del job y se va a reintentar, explícitamente podemos manejar esto de las dos maneras en que resolvemos un Job es decir con el objeto done, pasándole como primer parámetro el error, o retornando una promesa rechazada.

```
newsLetterMailQueue.process(async (job, done) => {
  await sendNewsLetterMailTo(job.data.email);
  done(new Error("Algo salió muy mal"))
})

newsLetterMailQueue.process(async (job, done) => {
  await sendNewsLetterMailTo(job.data.email);
  return Promise.reject({"message"; "Algo salió muy mal"})
})
```

Algo que es importante que notes es que los try y los catch no funcionan dentro de .process es decir que debes manejar los errores en bloques try y catch de funciones exteriores a queue.process.

**Concurrencia de jobs**

Algo que es muy interesante con BullJS es que podemos manejar concurrencia de jobs utilizando los procesadores que tenga nuestro computador, esto hace que podamos distribuir cargas de trabajo entre distintos nodos de una manera sencilla y dejarle a BullJS que maneja la concurrencia y la distribución, pero para ello se requiere que coloquemos la función process en un archivo independiente y que definamos cual sería la concurrencia máxima de Jobs en un mismo momento, veamos un ejemplo:

```
const numMaxJobsConcurrent = 4;
newsLetterMailQueue.process(numMaxJobsConcurrent, 'path/to/funcion/file.js')
```

De esta manera supongamos que cuatro usuarios se registran entonces BullJS es capaz de ejecutar dichos procesos de manera simultánea sin que ninguno bloquee a otro. Sin embargo tienes que exportar la función en el archivo que estás procesando:

```
///path/to/funcion/file.js

const processJob = async job => {
  /// Do something
 await sendNewsLetterMailTo(job.data.email);
}
module.exports = processJob
```

Así estarás asegurando el correcto funcionamiento de la concurrencia y podrás ejecutar tantos jobs como desees.

**Escuchando el estado de Jobs**

Hasta ahora hemos explorado bastantes funcionalidades de BullJS, sin embargo la más importante para mi resulta en la manera en que puedo escuchar por el estado y el resultado de un job en la misma aplicación o en una aplicación externa y completamente distinta, lo que quiere decir que si tienes dos o más servidores que ejecutan tareas y necesitan notificarse entre ellos el progreso y la completitud de las mismas aquí se vuelve aún más relevante esta librería. Imaginemos que una vez que se envía el email a nuestro usuario queremos enviarle un mensaje de texto y esto lo hará otro servidor totalmente distinto a donde tenemos alojado el código del envío de email. Bien lo que haremos será crear una cola con exactamente el mismo nombre y escucharemos por un mensaje que nos diga cuando un Job terminó:

```
import Queue from 'bull'

const newsLetterMailQueue = new Queue('newsLetterMail', {
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
})


newsLetterMailQueue.on('global:completed', async (jobId, result) => {
// aquí en result obtenemos el resultado que se envía y
// además un identificador único al Job

await sendSMS();

})
```

Dos cosas que son importantes notar aquí es:

i) El servidor que está escuchando por los mensajes debe tener BullJS instalado.

ii) Debe apuntar exactamente al mismo redis que está usando el otro servidor.

El evento 'global:completed' es el evento que se usa cross servidor es decir para servidores externos al que está procesando el job, pero si lo que quieres es hacerlo junto todo en el mismo servidor o proyecto, simplemente debes escuchar por el evento ‘completed’.

Además del evento completed hay una lista enorme de eventos por los que se puede escuchar, aquí veremos una lista:

```
.on('error', function(error) {
  // An error occured.
})

.on('waiting', function(jobId){
  // A Job is waiting to be processed as soon as a worker is idling.
});

.on('active', function(job, jobPromise){
  // A job has started. You can use `jobPromise.cancel()`` to abort it.
})

.on('stalled', function(job){
  // A job has been marked as stalled. This is useful for debugging job
  // workers that crash or pause the event loop.
})

.on('progress', function(job, progress){
  // A job's progress was updated!
})

.on('completed', function(job, result){
  // A job successfully completed with a `result`.
})

.on('failed', function(job, err){
  // A job failed with reason `err`!
})

.on('paused', function(){
  // The queue has been paused.
})

.on('resumed', function(job){
  // The queue has been resumed.
})

.on('cleaned', function(jobs, type) {
  // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
  // jobs, and `type` is the type of jobs cleaned.
});

.on('drained', function() {
  // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
});

.on('removed', function(job){
  // A job successfully removed.
});
```

Todos ellos dependen específicamente de cada caso de uso que tu le quieras dar y recuerda que a cada uno de ellos le puedes añadir el “global:” para que lo puedas utilizar cross proyecto.

**Conclusiones**

Finalmente te recomiendo probar muchisimo BullJS ya que es una librería muy simple con mucho poder, muy optimizada y que te permite controlar casi a cualquier nivel tus tareas, concurrencia y notificación entre proyectos, aquí encontrarás la lista de todos los ejemplos que he desarrollado para tí. Recuerda darle like al repositorio y crea pull requests con ejemplos nuevos para que entre todos aprendamos más sobre esta excelente librería:

Link al repositorio con todos los ejemplos.

Links a los ejemplos específicos.

1. Simple creación y ejecución de un Job
2. Ciclo de vida de un Job local y Global
3. Manejo de errores
4. Concurrencia de Jobs y notificaciones

<!-- Docs to Markdown version 1.0β21 -->
