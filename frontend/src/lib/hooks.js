import { useCallback, useEffect, useState } from "react";
import { RECAPTCHA_SITE_KEY } from "./api";

export const useRecaptcha = () => {
  const getToken = useCallback(
    (action = "submit") =>
      new Promise((resolve) => {
        if (typeof window === "undefined" || !window.grecaptcha) {
          resolve("dev_token");
          return;
        }
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(RECAPTCHA_SITE_KEY, { action })
            .then(resolve)
            .catch(() => resolve("dev_token"));
        });
      }),
    []
  );

  return getToken;
};

export const useOutsideClose = (refs, handler) => {
  useEffect(() => {
    const listener = (e) => {
      const clickedInside = refs.some((ref) => ref.current?.contains(e.target));
      if (!clickedInside) handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [refs, handler]);
};

export const useFloatingPosition = (open, rootRef, popupHeight = 350, popupWidth = 300) => {
  const [position, setPosition] = useState({
    vertical: "down",
    align: "left",
  });

  useEffect(() => {
    if (!open || !rootRef.current || typeof window === "undefined") return;

    const update = () => {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;
      const vertical =
        spaceBelow < popupHeight && spaceAbove > popupHeight ? "up" : "down";
      const align = spaceRight < popupWidth ? "right" : "left";
      setPosition({ vertical, align });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, rootRef, popupHeight, popupWidth]);

  return position;
};