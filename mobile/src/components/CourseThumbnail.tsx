import { memo, useEffect, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { resolveAssetUrl } from "../config";

type CourseThumbnailProps = {
  title: string;
  thumbnailUrl?: string | null;
  level?: string | null;
  height?: number;
};

export const CourseThumbnail = memo(function CourseThumbnail({
  title,
  thumbnailUrl,
  level,
  height = 148,
}: CourseThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = resolveAssetUrl(thumbnailUrl);
  const isSvg = Boolean(resolvedUrl && /\.svg($|\?)/i.test(resolvedUrl));
  const canRenderImage =
    Boolean(resolvedUrl) && !failed && !(Platform.OS !== "web" && isSvg);

  useEffect(() => {
    setFailed(false);
  }, [thumbnailUrl]);

  return (
    <View style={[styles.container, { height }]}>
      {canRenderImage && resolvedUrl ? (
        <Image
          source={{ uri: resolvedUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.initial}>{title.trim().charAt(0) || "E"}</Text>
          <Text style={styles.level}>{level || "COURSE"}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f2b3d",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f2b3d",
  },
  initial: { color: "#5eead4", fontSize: 44, fontWeight: "800" },
  level: {
    color: "#99f6e4",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: 4,
  },
});
