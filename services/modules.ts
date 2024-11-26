async function userSession() {
  const mongoose = await import('@omniflex/module-user-session-mongoose');

  mongoose.createRegisteredRepositories();
}

async function postgresIdentity() {
  const postgres = await import('@omniflex/module-identity-postgres');
  const {
    requiredString,
    toRequiredArray,
  } = await import('@omniflex/infra-postgres/types');

  const userSchema = postgres.getUserSchema({
    ...postgres.userBaseSchema,
    appTypes: {
      ...toRequiredArray(requiredString()),
      defaultValue: [],
    },
  });

  postgres.createRegisteredRepositories(userSchema);
}

async function mongooseIdentity() {
  const mongoose = await import('@omniflex/module-identity-mongoose');
  const { requiredString } = await import('@omniflex/infra-mongoose/types');

  const userSchema = mongoose.getUserSchema({
    ...mongoose.userBaseSchema,
    appTypes: [requiredString],
  });

  mongoose.createRegisteredRepositories(userSchema);
}

async function routes() {
  await import('@/modules/identity');
}

export const initialize = async () => {
  //await postgresIdentity();
  await mongooseIdentity();
  await userSession();

  await routes();
};