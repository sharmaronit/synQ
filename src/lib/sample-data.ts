import type { Dataset } from "@/types";
import { parseCSV, inferSchema } from "@/lib/csv-parser";

const ecommerceCSV = `Order_ID,Product,Category,Quantity,Unit_Price,Total,Region,Date,Customer_Segment
1001,Wireless Mouse,Electronics,2,29.99,59.98,North,2024-01-15,Consumer
1002,Desk Lamp,Office,1,45.00,45.00,South,2024-01-16,Corporate
1003,USB Cable,Electronics,5,8.99,44.95,East,2024-01-16,Consumer
1004,Notebook Set,Office,3,12.50,37.50,West,2024-01-17,Home Office
1005,Headphones,Electronics,1,79.99,79.99,North,2024-01-18,Consumer
1006,Printer Paper,Office,10,5.99,59.90,South,2024-01-18,Corporate
1007,Webcam,Electronics,1,65.00,65.00,East,2024-01-19,Home Office
1008,Sticky Notes,Office,8,3.50,28.00,West,2024-01-20,Consumer
1009,Monitor Stand,Furniture,1,89.99,89.99,North,2024-01-21,Corporate
1010,Keyboard,Electronics,2,49.99,99.98,South,2024-01-22,Consumer
1011,Filing Cabinet,Furniture,1,199.99,199.99,East,2024-01-23,Corporate
1012,Mouse Pad,Office,4,9.99,39.96,West,2024-01-24,Consumer
1013,External SSD,Electronics,1,119.99,119.99,North,2024-01-25,Home Office
1014,Desk Chair,Furniture,1,349.99,349.99,South,2024-01-26,Corporate
1015,Whiteboard,Office,2,34.99,69.98,East,2024-01-27,Consumer
1016,USB Hub,Electronics,3,24.99,74.97,West,2024-01-28,Home Office
1017,Bookshelf,Furniture,1,129.99,129.99,North,2024-01-29,Corporate
1018,Stapler,Office,6,7.99,47.94,South,2024-01-30,Consumer
1019,Laptop Stand,Electronics,1,54.99,54.99,East,2024-02-01,Home Office
1020,Desk Organizer,Office,2,19.99,39.98,West,2024-02-02,Consumer
1021,Power Strip,Electronics,4,15.99,63.96,North,2024-02-03,Corporate
1022,Standing Desk,Furniture,1,499.99,499.99,South,2024-02-04,Home Office
1023,Pen Set,Office,5,6.99,34.95,East,2024-02-05,Consumer
1024,HDMI Cable,Electronics,3,12.99,38.97,West,2024-02-06,Corporate
1025,Paper Shredder,Office,1,89.99,89.99,North,2024-02-07,Corporate
1026,Tablet Stand,Electronics,2,29.99,59.98,South,2024-02-08,Consumer
1027,Ergonomic Chair,Furniture,1,279.99,279.99,East,2024-02-09,Home Office
1028,Binder Clips,Office,10,2.99,29.90,West,2024-02-10,Consumer
1029,Wireless Charger,Electronics,2,34.99,69.98,North,2024-02-11,Consumer
1030,File Folders,Office,12,1.99,23.88,South,2024-02-12,Corporate`;

const hrCSV = `Employee_ID,Name,Department,Position,Salary,Hire_Date,Performance_Score,Years_Experience
E001,Alice Johnson,Engineering,Senior Dev,120000,2019-03-15,4.5,8
E002,Bob Smith,Marketing,Manager,95000,2020-07-01,3.8,5
E003,Charlie Brown,Engineering,Lead Dev,135000,2017-01-10,4.8,11
E004,Diana Prince,Sales,Rep,65000,2022-06-20,3.5,2
E005,Edward Norton,HR,Director,110000,2018-11-05,4.2,9
E006,Fiona Green,Engineering,Junior Dev,72000,2023-02-14,3.9,1
E007,George Wilson,Marketing,Analyst,78000,2021-09-12,4.0,3
E008,Hannah Lee,Sales,Manager,98000,2019-04-22,4.3,6
E009,Ian Clark,Engineering,Senior Dev,125000,2018-08-30,4.6,10
E010,Julia Roberts,Finance,Analyst,82000,2020-12-01,3.7,4
E011,Kevin Hart,Sales,Rep,62000,2023-05-15,3.2,1
E012,Laura Palmer,Engineering,Staff Dev,145000,2016-03-20,4.9,13
E013,Mike Chang,Marketing,Director,115000,2017-07-11,4.4,8
E014,Nancy Drew,HR,Coordinator,58000,2022-10-05,3.6,2
E015,Oscar Wilde,Finance,Manager,105000,2019-01-18,4.1,7
E016,Priya Patel,Engineering,Senior Dev,128000,2018-06-25,4.7,9
E017,Quinn Fox,Sales,Rep,67000,2021-11-30,3.4,3
E018,Rachel Green,Marketing,Coordinator,55000,2023-08-01,3.3,0
E019,Sam Wilson,Engineering,Lead Dev,140000,2016-09-14,4.8,12
E020,Tina Fey,Finance,Director,130000,2017-02-28,4.5,10`;

const studentCSV = `Student_ID,Name,Subject,Score,Grade,Semester,Year,Attendance_Pct
S001,Aarav Patel,Mathematics,92,A,Fall,2024,95
S002,Priya Sharma,English,78,B+,Fall,2024,88
S003,Rahul Gupta,Mathematics,65,C+,Fall,2024,72
S004,Sneha Reddy,Science,88,A-,Fall,2024,91
S005,Vikram Singh,English,95,A+,Fall,2024,98
S006,Ananya Iyer,Science,71,B,Fall,2024,80
S007,Arjun Nair,Mathematics,83,A-,Fall,2024,85
S008,Diya Joshi,English,69,C+,Fall,2024,75
S009,Kabir Mehta,Science,94,A,Fall,2024,97
S010,Meera Das,Mathematics,77,B+,Fall,2024,82
S011,Aarav Patel,English,85,A-,Spring,2024,93
S012,Priya Sharma,Mathematics,72,B,Spring,2024,85
S013,Rahul Gupta,Science,58,C,Spring,2024,65
S014,Sneha Reddy,English,91,A,Spring,2024,94
S015,Vikram Singh,Mathematics,88,A-,Spring,2024,96
S016,Ananya Iyer,English,82,A-,Spring,2024,87
S017,Arjun Nair,Science,76,B+,Spring,2024,83
S018,Diya Joshi,Mathematics,63,C+,Spring,2024,70
S019,Kabir Mehta,English,89,A-,Spring,2024,95
S020,Meera Das,Science,81,A-,Spring,2024,86
S021,Rohan Kumar,Mathematics,90,A,Fall,2024,92
S022,Isha Verma,Science,84,A-,Fall,2024,89
S023,Rohan Kumar,English,73,B,Spring,2024,78
S024,Isha Verma,Mathematics,86,A-,Spring,2024,90`;

export interface DemoDatasetMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  rowCount: number;
  samplePrompts: string[];
}

export const DEMO_DATASETS: DemoDatasetMeta[] = [
  {
    id: "ecommerce",
    name: "E-Commerce Sales",
    description: "Product orders across regions and customer segments",
    icon: "ShoppingCart",
    rowCount: 30,
    samplePrompts: [
      "Show total revenue by region",
      "Which product category sells the most?",
      "Revenue trend over time",
      "Compare customer segments",
    ],
  },
  {
    id: "hr",
    name: "Employee HR Data",
    description: "Employee salaries, departments, and performance",
    icon: "Users",
    rowCount: 20,
    samplePrompts: [
      "Average salary by department",
      "Experience vs salary relationship",
      "Performance score distribution",
      "Top performers by department",
    ],
  },
  {
    id: "students",
    name: "Student Scores",
    description: "Academic performance across subjects and semesters",
    icon: "GraduationCap",
    rowCount: 24,
    samplePrompts: [
      "Average score by subject",
      "Grade distribution across subjects",
      "Attendance vs score correlation",
      "Top 10 students overall",
    ],
  },
];

const csvMap: Record<string, string> = {
  ecommerce: ecommerceCSV,
  hr: hrCSV,
  students: studentCSV,
};

export function loadDemoDataset(id: string): Dataset {
  const csv = csvMap[id];
  if (!csv) throw new Error(`Unknown demo dataset: ${id}`);
  const meta = DEMO_DATASETS.find((d) => d.id === id)!;
  const rows = parseCSV(csv);
  const schema = inferSchema(rows);
  return { name: meta.name, rows, schema, source: "demo" };
}
