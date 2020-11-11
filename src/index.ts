import { toRefs } from 'vue';
import { BaseOptions } from './config';
import { Query } from './createQuery';
import useAsyncQuery from './useAsyncQuery';
import { isFunction, isPlainObject, isPromise, isString } from './utils';

export type ServiceObject = {
  [key: string]: any;
  url: string;
};
export type ServiceParams = string | ServiceObject;
export type IService<R, P extends unknown[]> =
  | ((...args: P) => ServiceParams)
  | ServiceParams
  | Query<R, P>;

function requestProxy(...args: unknown[]) {
  // @ts-ignore
  return fetch(...args).then(res => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(res.statusText);
  });
}

function useRequest<R, P extends unknown[]>(
  service: IService<R, P>,
  options: BaseOptions<R, P> = {},
) {
  const requestMethod = requestProxy;

  let promiseQuery: (() => Promise<R>) | ((...args: P) => Promise<R>);

  if (isFunction(service)) {
    promiseQuery = (...args: P) => {
      const _service = service(...args);
      let finallyService: Promise<R>;
      // 是否为普通异步请求
      if (!isPromise(_service)) {
        if (isPlainObject(_service)) {
          const { url, ...rest } = _service;
          finallyService = requestMethod(url, rest);
        } else if (isString(_service)) {
          finallyService = requestMethod(_service);
        } else {
          throw new Error('Unknown service type');
        }
      } else {
        finallyService = _service;
      }

      return new Promise<R>((resolve, reject) => {
        finallyService.then(resolve).catch(reject);
      });
    };
  } else if (isPlainObject(service)) {
    const { url, ...rest } = service;
    promiseQuery = () => requestMethod(url, rest);
  } else if (isString(service)) {
    promiseQuery = () => requestMethod(service);
  } else {
    throw Error('Unknown service type');
  }

  return toRefs(useAsyncQuery<R, P>(promiseQuery, options));
}

export default useRequest;