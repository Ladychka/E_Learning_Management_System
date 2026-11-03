jest.mock("axios", () => {
  const client: any = jest.fn();
  client.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  client.post = jest.fn();
  client.get = jest.fn();
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => client),
      post: jest.fn(),
      isAxiosError: jest.fn(
        (error: any) => Boolean(error && error.isAxiosError === true)
      ),
    },
  };
});

jest.mock("../../storage/tokenStorage", () => ({
  tokenStorage: {
    save: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    clear: jest.fn(),
  },
}));

import axios from "axios";
import { apiClient, setSessionExpiredHandler } from "../client";
import { tokenStorage } from "../../storage/tokenStorage";

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockClient = (axios.create as jest.Mock).mock.results[0]
  .value as any;
const responseErrorHandler = (
  mockClient.interceptors.response.use as jest.Mock
).mock.calls[0][1];
const getResponseErrorHandler = () => responseErrorHandler;

describe("API client token refresh", () => {
  beforeEach(() => {
    mockClient.mockReset();
    (mockedAxios.post as jest.Mock).mockReset();
    (tokenStorage.getRefreshToken as jest.Mock).mockReset();
    (tokenStorage.save as jest.Mock).mockReset();
    (tokenStorage.clear as jest.Mock).mockReset();
    setSessionExpiredHandler(null);
  });

  it("expires the session when no refresh token is available", async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);

    const handler = getResponseErrorHandler();
    const error = {
      config: { url: "/courses", headers: {} },
      response: { status: 401 },
    };

    await expect(handler(error)).rejects.toBe(error);
    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(expired).toHaveBeenCalled();
  });

  it("expires the session when refresh returns 401", async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh");
    (mockedAxios.post as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(
      getResponseErrorHandler()({
        config: { url: "/courses", headers: {} },
        response: { status: 401 },
      })
    ).rejects.toBeTruthy();

    expect(tokenStorage.save).not.toHaveBeenCalled();
    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(expired).toHaveBeenCalled();
  });

  it("keeps tokens when refresh fails with a network/5xx error", async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh");
    (mockedAxios.post as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { status: 500 },
    });

    await expect(
      getResponseErrorHandler()({
        config: { url: "/courses", headers: {} },
        response: { status: 401 },
      })
    ).rejects.toBeTruthy();

    expect(tokenStorage.clear).not.toHaveBeenCalled();
    expect(expired).not.toHaveBeenCalled();
  });

  it("saves the new token and retries the original request after refresh", async () => {
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh");
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: { data: { accessToken: "new-access" } },
    });
    mockClient.mockResolvedValue({ data: { ok: true } });

    const originalRequest: any = {
      url: "/courses",
      headers: {},
    };
    const result = await getResponseErrorHandler()({
      config: originalRequest,
      response: { status: 401 },
    });

    expect(tokenStorage.save).toHaveBeenCalledWith("new-access", "refresh");
    expect(originalRequest.headers.Authorization).toBe("Bearer new-access");
    expect(mockClient).toHaveBeenCalledWith(originalRequest);
    expect(result).toEqual({ data: { ok: true } });
  });
});
