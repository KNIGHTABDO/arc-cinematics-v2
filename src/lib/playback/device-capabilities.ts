export interface DeviceCapabilities {
  isIOS: boolean;
  isSafari: boolean;
  supportsHEVC: boolean;
  preferredLanguage: string;
}

export function detectDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === "undefined") {
    return { isIOS: false, isSafari: false, supportsHEVC: true, preferredLanguage: "en" };
  }
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS =
    /ipad|iphone|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /safari/.test(userAgent) && !/chrome|chromium|crios|opr|edg/.test(userAgent);

  let supportsHEVC = false;
  if (window.MediaSource && MediaSource.isTypeSupported) {
    supportsHEVC = MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.c.L120.90"');
  } else {
    const video = document.createElement("video");
    supportsHEVC = video.canPlayType('video/mp4; codecs="hvc1.1.c.L120.90"') !== "";
  }

  return {
    isIOS,
    isSafari,
    supportsHEVC,
    preferredLanguage: navigator.language.split("-")[0] || "en",
  };
}
