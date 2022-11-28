import {Effect, Layer, Context, pipe, Runtime} from 'effect';
import fastify from 'fastify';
import * as MongoDB from 'mongodb';

type DB = MongoDB.Db;
const DB = Context.Tag<DB>();
const createDB = () => Layer.fromEffect(DB)(Effect.promise(async () => {
    const url = new URL('mongodb://root:password@localhost:27017');
    const mongoClient = new MongoDB.MongoClient(url.toString());
    const client = await mongoClient.connect();
    return client.db('test');
}));


const stats = () => pipe(
    Effect.service(DB),
    Effect.flatMap(db => Effect.promise(() => db.stats())),
);

const withRuntime = (runtime: Runtime.Runtime<DB>) => pipe(
        Effect.promise(async () => {
            const server = fastify({logger: true});

            server.get('/', (_request, _response) =>
                pipe(stats(), runtime.unsafeRunPromise),
            );

            await server.listen({
                port: 3000,
                host: '0.0.0.0',
            });
        }),
        Effect.zipLeft(Effect.never()),
);

const main = () => {
    const dependencies = createDB();

    return pipe(
        Effect.runtime<DB>(),
        Effect.provideLayer(dependencies),
        Effect.flatMap(withRuntime),
        Effect.unsafeRunPromise,
    );
};

main();
