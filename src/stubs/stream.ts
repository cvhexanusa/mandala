class MockReadable {}

export { MockReadable as Readable };

const mockStream = {
  Readable: MockReadable,
};

export default mockStream;
