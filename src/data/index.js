export const MEMBERS = [
  { id: 1, name: "fridah O.", initials: "MH", role: "Matriarch", color: "#9c3d1e", online: true, memories: 147, vaults: 8, joined: "2019" },
  { id: 2, name: "Morgan O.", initials: "RH", role: "Patriarch", color: "#3d4f5c", online: false, memories: 92, vaults: 5, joined: "2019" },
  { id: 3, name: "Desailly A.", initials: "CH", role: "Daughter", color: "#4a6741", online: true, memories: 78, vaults: 4, joined: "2020" },
  { id: 4, name: "Benita B.", initials: "JH", role: "Son", color: "#c8792a", online: false, memories: 54, vaults: 3, joined: "2021" },
  { id: 5, name: "Mark O.", initials: "LH", role: "Granddaughter", color: "#6b4c8c", online: true, memories: 31, vaults: 2, joined: "2023" },
  { id: 6, name: "Thomas H.", initials: "TH", role: "Grandson", color: "#2c6b7a", online: false, memories: 18, vaults: 1, joined: "2023" },
];

export const MEMORIES = [
  { id: 1, author: "Fridah O.", emoji: "🏠", color: "#fef3e6", text: "Found the old recipe book from Grandma Elise. Scanning all 200+ pages to preserve them in the Recipes vault.", tags: ["recipes", "heritage", "documents"], time: "2 hours ago" },
  { id: 2, author: "Desailly A.", emoji: "📸", color: "#edf5ec", text: "Uploaded the summer reunion photos from Lake Tahoe — all 340 of them! Tagged everyone I could recognize.", tags: ["photos", "2024-reunion", "lake-tahoe"], time: "Yesterday" },
  { id: 3, author: "Benita B.", emoji: "🎵", color: "#e8f0f5", text: "Added Dad's old vinyl collection recordings. The original LP of Sgt. Pepper sounds incredible even digitized.", tags: ["music", "vinyl", "heritage"], time: "3 days ago" },
  { id: 4, author: "Fridah O.", emoji: "📜", color: "#fef3e6", text: "Uploaded Granddad's military service records from the National Archives. Incredible primary sources for the family history.", tags: ["military", "documents", "history"], time: "1 week ago" },
  { id: 5, author: "Robert H.", emoji: "🗺️", color: "#e8f0f5", text: "Traced our family origins back to County Kerry, Ireland circa 1840s. Added a new branch to the Family Tree.", tags: ["genealogy", "ireland", "heritage"], time: "2 weeks ago" },
  { id: 6, author: "Mark O.", emoji: "🎨", color: "#f0edf7", text: "Digitized all my childhood drawings from kindergarten through 5th grade. Mom is obsessed with them already 😄", tags: ["artwork", "childhood", "personal"], time: "3 weeks ago" },
];

export const VAULTS = [
  { id: 1, name: "Family Photos", emoji: "📸", desc: "A visual archive of your family across generations.", items: 1247, size: "4.2 GB", cover: "linear-gradient(135deg,#f5e6d3,#e8c4a0)", access: "family", locked: false },
  { id: 2, name: "Legal & Estate", emoji: "⚖️", desc: "Wills, deeds, legal documents and estate planning materials.", items: 86, size: "340 MB", cover: "linear-gradient(135deg,#d3dde5,#a0b4c2)", access: "restricted", locked: true },
  { id: 3, name: "Heritage Recipes", emoji: "🍲", desc: "Multi-generational recipe books, handwritten cards, and meal traditions.", items: 312, size: "820 MB", cover: "linear-gradient(135deg,#ebe6d3,#c9b98a)", access: "family", locked: false },
  { id: 4, name: "Medical History", emoji: "🏥", desc: "Genetic health records, vaccinations and hereditary conditions.", items: 54, size: "180 MB", cover: "linear-gradient(135deg,#d3e5d9,#9abba2)", access: "restricted", locked: true },
  { id: 5, name: "Music & Audio", emoji: "🎵", desc: "Recordings, vinyl digitizations, family performances and voice notes.", items: 203, size: "12.1 GB", cover: "linear-gradient(135deg,#ddd3e5,#b09ac4)", access: "family", locked: false },
  { id: 6, name: "Letters & Writing", emoji: "✉️", desc: "Correspondence, diaries, journals and original writing by family members.", items: 441, size: "1.1 GB", cover: "linear-gradient(135deg,#e5d3d3,#c4968e)", access: "family", locked: false },
];

export const NOTIFS = [
  { text: "Fridah O. added 340 new photos to Family Photos", time: "2h ago" },
  { text: "Mark O. shared a new memory in Heritage Recipes", time: "Yesterday" },
  { text: "Legal & Estate vault was accessed by Robert H.", time: "3d ago" },
  { text: "Benita B. joined the family commons", time: "1w ago" },
];

export const TREE_NODES = [
  { id: "g1", x: 180, y: 50, label: "Peter o.", sub: "1918–1992", color: "#3d4f5c" },
  { id: "g2", x: 420, y: 50, label: "Mary o.", sub: "1922–2005", color: "#9c3d1e" },
  { id: "p1", x: 180, y: 160, label: "Robert H.", sub: "b. 1948", color: "#3d4f5c" },
  { id: "p2", x: 420, y: 160, label: "Fridah O.", sub: "b. 1952", color: "#9c3d1e" },
  { id: "c1", x: 100, y: 270, label: "Desailly A.", sub: "b. 1978", color: "#4a6741" },
  { id: "c2", x: 300, y: 270, label: "Morgan B.", sub: "b. 1981", color: "#c8792a" },
  { id: "c3", x: 500, y: 270, label: "Mark O.", sub: "b. 1985", color: "#3d4f5c" },
  { id: "gc1", x: 60, y: 340, label: "Benita B.", sub: "b. 2008", color: "#6b4c8c" },
  { id: "gc2", x: 150, y: 340, label: "Thomas H.", sub: "b. 2010", color: "#2c6b7a" },
];

export const TREE_EDGES = [
  ["g1","g2"], ["g1","p1"], ["g2","p1"], ["p1","p2"],
  ["p1","c1"], ["p1","c2"], ["p1","c3"],
  ["p2","c1"], ["p2","c2"], ["p2","c3"],
  ["c1","gc1"], ["c1","gc2"]
];
