export const REMITTANCE_PLATFORMS = [
  { value: "Western Union", logo: "/platforms/wu.png", limit: 800000 },
  { value: "DBS", logo: "/platforms/dbs.jpg", limit: 1000000 },
  { value: "IndusInd", logo: "/platforms/indusind.png", limit: 1000000 },
  { value: "Niyo Global", logo: "/platforms/niyo.png", limit: 1000000 },
];

export const platformMeta = (value) => REMITTANCE_PLATFORMS.find((item) => item.value === value);
