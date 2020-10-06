/**
 * Narrowing class instances to the one.
 *
 * @example
 *  const usersStore = UsersStore.getInstance(); // is `UsersStore`
 */

type Constructor<T, R extends any[]> = new (...args: R) => T;

class Singleton {
  private static instances = new WeakMap<object, Singleton>();

  static getInstance<T, R extends any[]>(this: Constructor<T, R>, ...args: ConstructorParameters<Constructor<T, R>>): T {
    if (!Singleton.instances.has(this)) {
      Singleton.instances.set(this, new this(...args))
    }
    return Singleton.instances.get(this) as T
  }

  static resetInstance() {
    Singleton.instances.delete(this)
  }
}

export { Singleton }
export default Singleton;
