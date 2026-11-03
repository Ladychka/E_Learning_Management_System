/* eslint-env jest */

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => ({
    isConnected: true,
    isInternetReachable: true,
  }),
}));

jest.mock("expo-video", () => ({
  useVideoPlayer: jest.fn(() => ({})),
  VideoView: () => null,
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock("@expo/vector-icons/Ionicons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockIonicons(props) {
    return React.createElement(Text, props, props.name);
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: (props) => React.createElement(View, props, props.children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback) => {
      React.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [callback]);
    },
  };
});
