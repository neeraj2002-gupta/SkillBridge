export type SwapUser = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  location: string;
  rating: number;
  bio: string;
  teach: string[];
  learn: string[];
  category: "Tech" | "Healthcare" | "Design" | "Business";
  user_status?: string;
  institution_name?: string | null;
};

export const mockUsers: SwapUser[] = [
  {
    id: "u1",
    name: "Alok Verma",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alok",
    role: "Registered Nurse",
    location: "Lucknow, IN",
    rating: 4.9,
    bio: "5 yrs ICU experience. Love teaching care planning to non-clinicians.",
    teach: ["Nursing Care Plans", "Medical Terminology", "Patient Assessment"],
    learn: ["Java", "Spring Boot", "OOP"],
    category: "Healthcare",
  },
  {
    id: "u2",
    name: "Priya Nair",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    role: "Frontend Engineer",
    location: "Bengaluru, IN",
    rating: 4.8,
    bio: "React + TypeScript nerd. Curious about pharmacology basics.",
    teach: ["React", "TypeScript", "Tailwind CSS"],
    learn: ["Pharmacology", "Anatomy"],
    category: "Tech",
  },
  {
    id: "u3",
    name: "Marcus Lee",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    role: "CS Student",
    location: "Singapore",
    rating: 4.6,
    bio: "Grinding LeetCode. Want to learn first-aid for travel.",
    teach: ["Data Structures", "Algorithms", "Python"],
    learn: ["First Aid", "CPR Basics"],
    category: "Tech",
  },
  {
    id: "u4",
    name: "Sara Ahmed",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
    role: "Pharmacist",
    location: "Dubai, UAE",
    rating: 5.0,
    bio: "Clinical pharmacist exploring health-tech product design.",
    teach: ["Pharmacology", "Drug Interactions"],
    learn: ["UI/UX Design", "Figma"],
    category: "Healthcare",
  },
  {
    id: "u5",
    name: "Diego Ramos",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diego",
    role: "Product Designer",
    location: "Mexico City, MX",
    rating: 4.7,
    bio: "Designing for healthcare apps. Want to ship my own MVPs.",
    teach: ["UI/UX Design", "Figma", "Design Systems"],
    learn: ["React", "Next.js"],
    category: "Design",
  },
  {
    id: "u6",
    name: "Neha Patel",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neha",
    role: "Nursing Student",
    location: "Ahmedabad, IN",
    rating: 4.5,
    bio: "Final-year BSc Nursing. Love coding side-projects.",
    teach: ["Patient Assessment", "Vital Signs", "Care Plans"],
    learn: ["JavaScript", "React", "OOP"],
    category: "Healthcare",
  },
  {
    id: "u7",
    name: "James O'Brien",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    role: "Java Backend Dev",
    location: "Dublin, IE",
    rating: 4.9,
    bio: "10 yrs Java/Spring. Want to understand clinical workflows.",
    teach: ["Java", "Spring Boot", "System Design"],
    learn: ["Medical Terminology", "EHR Basics"],
    category: "Tech",
  },
  {
    id: "u8",
    name: "Lina Kowalski",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lina",
    role: "Healthcare PM",
    location: "Berlin, DE",
    rating: 4.8,
    bio: "PM at a digital health startup. Learning to read code.",
    teach: ["Product Strategy", "Healthcare Compliance"],
    learn: ["Python", "SQL"],
    category: "Business",
  },
];

export const swapRequests = [
  { id: "s1", from: "Alok Verma", skillOffered: "Nursing Care Plans", skillWanted: "Java", status: "Pending" as const },
  { id: "s2", from: "Priya Nair", skillOffered: "React", skillWanted: "Pharmacology", status: "Accepted" as const },
  { id: "s3", from: "Marcus Lee", skillOffered: "Data Structures", skillWanted: "First Aid", status: "Pending" as const },
];