const seedVaults = [
  {
    name: "Family Photos",
    emoji: "P",
    description: "A visual archive of your family across generations.",
    items: 1247,
    sizeLabel: "4.2 GB",
    cover: "linear-gradient(135deg,#f5e6d3,#e8c4a0)",
    accessLevel: "family",
    locked: 0,
    usagePercent: 68,
  },
  {
    name: "Legal and Estate",
    emoji: "L",
    description: "Wills, deeds, legal documents and estate planning materials.",
    items: 86,
    sizeLabel: "340 MB",
    cover: "linear-gradient(135deg,#d3dde5,#a0b4c2)",
    accessLevel: "restricted",
    locked: 1,
    usagePercent: 42,
  },
  {
    name: "Heritage Recipes",
    emoji: "R",
    description: "Multi-generational recipe books, handwritten cards, and meal traditions.",
    items: 312,
    sizeLabel: "820 MB",
    cover: "linear-gradient(135deg,#ebe6d3,#c9b98a)",
    accessLevel: "family",
    locked: 0,
    usagePercent: 31,
  },
  {
    name: "Medical History",
    emoji: "H",
    description: "Genetic health records, vaccinations and hereditary conditions.",
    items: 54,
    sizeLabel: "180 MB",
    cover: "linear-gradient(135deg,#d3e5d9,#9abba2)",
    accessLevel: "restricted",
    locked: 1,
    usagePercent: 55,
  },
];

const seedMembers = [
  { name: "Margaret H.", initials: "MH", role: "Matriarch", color: "#9c3d1e", online: 1, memories: 147, vaults: 8, joined: "2019" },
  { name: "Robert H.", initials: "RH", role: "Patriarch", color: "#3d4f5c", online: 0, memories: 92, vaults: 5, joined: "2019" },
  { name: "Claire H.", initials: "CH", role: "Daughter", color: "#4a6741", online: 1, memories: 78, vaults: 4, joined: "2020" },
  { name: "James H.", initials: "JH", role: "Son", color: "#c8792a", online: 0, memories: 54, vaults: 3, joined: "2021" },
  { name: "Lily H.", initials: "LH", role: "Granddaughter", color: "#6b4c8c", online: 1, memories: 31, vaults: 2, joined: "2023" },
  { name: "Thomas H.", initials: "TH", role: "Grandson", color: "#2c6b7a", online: 0, memories: 18, vaults: 1, joined: "2023" },
];

const seedMemories = [
  {
    author: "Margaret H.",
    emoji: "R",
    color: "#fef3e6",
    title: "Grandma Elise recipe archive",
    text: "Found the old recipe book from Grandma Elise. Scanning all 200+ pages to preserve them in the Recipes vault.",
    tags: ["recipes", "heritage", "documents"],
    vaultName: "Heritage Recipes",
  },
  {
    author: "Claire H.",
    emoji: "P",
    color: "#edf5ec",
    title: "Summer reunion photos",
    text: "Uploaded the summer reunion photos from Lake Tahoe and tagged everyone I recognized.",
    tags: ["photos", "2024-reunion", "lake-tahoe"],
    vaultName: "Family Photos",
  },
  {
    author: "James H.",
    emoji: "M",
    color: "#e8f0f5",
    title: "Vinyl recordings",
    text: "Added Dad's old vinyl collection recordings. The original LP audio still sounds incredible.",
    tags: ["music", "vinyl", "heritage"],
    vaultName: "Family Photos",
  },
  {
    author: "Margaret H.",
    emoji: "D",
    color: "#fef3e6",
    title: "Military service records",
    text: "Uploaded Granddad's military service records from the national archives.",
    tags: ["military", "documents", "history"],
    vaultName: "Legal and Estate",
  },
];

const seedNotifications = [
  { text: "Claire H. added 340 new photos to Family Photos", timeLabel: "2h ago" },
  { text: "Margaret H. shared a new memory in Heritage Recipes", timeLabel: "Yesterday" },
  { text: "Legal and Estate vault was accessed by Robert H.", timeLabel: "3d ago" },
  { text: "Lily H. joined the family commons", timeLabel: "1w ago" },
];

const treeNodes = [
  { nodeId: "g1", x: 180, y: 50, label: "George H.", subLabel: "1918-1992", color: "#3d4f5c" },
  { nodeId: "g2", x: 420, y: 50, label: "Elise H.", subLabel: "1922-2005", color: "#9c3d1e" },
  { nodeId: "p1", x: 180, y: 160, label: "Robert H.", subLabel: "b. 1948", color: "#3d4f5c" },
  { nodeId: "p2", x: 420, y: 160, label: "Margaret H.", subLabel: "b. 1952", color: "#9c3d1e" },
  { nodeId: "c1", x: 100, y: 270, label: "Claire H.", subLabel: "b. 1978", color: "#4a6741" },
  { nodeId: "c2", x: 300, y: 270, label: "James H.", subLabel: "b. 1981", color: "#c8792a" },
  { nodeId: "c3", x: 500, y: 270, label: "Susan H.", subLabel: "b. 1985", color: "#3d4f5c" },
  { nodeId: "gc1", x: 60, y: 340, label: "Lily H.", subLabel: "b. 2008", color: "#6b4c8c" },
  { nodeId: "gc2", x: 150, y: 340, label: "Thomas H.", subLabel: "b. 2010", color: "#2c6b7a" },
];

const treeEdges = [
  ["g1", "g2"], ["g1", "p1"], ["g2", "p1"], ["p1", "p2"],
  ["p1", "c1"], ["p1", "c2"], ["p1", "c3"],
  ["p2", "c1"], ["p2", "c2"], ["p2", "c3"],
  ["c1", "gc1"], ["c1", "gc2"],
];

const seedSettings = [
  {
    section: "Encryption and Security",
    icon: "S",
    itemLabel: "End-to-End Encryption",
    itemDescription: "All family data is encrypted with AES-256 before leaving any device.",
    enabled: 1,
  },
  {
    section: "Encryption and Security",
    icon: "S",
    itemLabel: "Zero-Knowledge Architecture",
    itemDescription: "Homecache servers never have access to plaintext data.",
    enabled: 1,
  },
  {
    section: "Encryption and Security",
    icon: "S",
    itemLabel: "Biometric Unlock",
    itemDescription: "Require biometric authentication to access restricted vaults.",
    enabled: 0,
  },
  {
    section: "Sync and Distribution",
    icon: "N",
    itemLabel: "Auto-Sync on Wi-Fi",
    itemDescription: "Automatically sync when connected to a trusted network.",
    enabled: 1,
  },
  {
    section: "Sync and Distribution",
    icon: "N",
    itemLabel: "Cellular Sync",
    itemDescription: "Use cellular data for syncing smaller files.",
    enabled: 0,
  },
  {
    section: "Privacy and Access",
    icon: "P",
    itemLabel: "Access Audit Log",
    itemDescription: "Keep a log of who accessed what and when.",
    enabled: 1,
  },
  {
    section: "Privacy and Access",
    icon: "P",
    itemLabel: "Guest Access",
    itemDescription: "Allow temporary access links for non-members.",
    enabled: 0,
  },
];

module.exports = {
  seedVaults,
  seedMembers,
  seedMemories,
  seedNotifications,
  treeNodes,
  treeEdges,
  seedSettings,
};

