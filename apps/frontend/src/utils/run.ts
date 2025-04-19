export function run<T>(callback: () => T): T {
  return callback()
}
