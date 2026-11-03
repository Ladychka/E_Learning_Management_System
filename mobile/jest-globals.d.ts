/// <reference types="jest" />
declare var jest: typeof import("@jest/globals").jest;

declare namespace jest {
  type Mock<T extends (...args: any[]) => any = (...args: any[]) => any> =
    import("@jest/globals").jest.Mock<T>;
  type Mocked<T> = import("@jest/globals").jest.Mocked<T>;
}
