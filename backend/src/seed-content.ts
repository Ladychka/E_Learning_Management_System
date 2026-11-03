import { prisma } from "./lib/prisma";

async function seedContent() {
  console.log(" Seeding course content...");

  const instructor = await prisma.user.findFirst({ where: { role: "INSTRUCTOR" } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const creatorId = instructor?.id || admin?.id;
  if (!creatorId) {
    console.error("No instructor or admin found. Run seed.ts first.");
    process.exit(1);
  }

  // ─── Course 1: Introduction to Web Development (ensure it has content) ───
  const webCourse = await prisma.course.findUnique({
    where: { slug: "intro-to-web-development" },
  });

  if (webCourse) {
    console.log("Seeding Web Development course content...");

    // Module 1: HTML Basics
    const htmlModule = await prisma.module.create({
      data: {
        courseId: webCourse.id,
        title: "Module 1: HTML Foundations",
        description: "Learn the building blocks of every web page.",
        sortOrder: 0,
        isPublished: true,
        lessons: {
          create: [
            {
              title: "What is HTML?",
              description: "An introduction to HyperText Markup Language.",
              contentType: "video",
              contentUrl: "https://www.youtube.com/embed/UB1O30fR-EE",
              duration: 15,
              isPublished: true,
              isPreview: true,
              sortOrder: 0,
            },
            {
              title: "HTML Document Structure",
              description: "Understanding the basic skeleton of an HTML page.",
              contentType: "text",
              duration: 10,
              isPublished: true,
              sortOrder: 1,
            },
            {
              title: "Common HTML Tags",
              description: "Learn paragraphs, headings, links, images and lists.",
              contentType: "text",
              duration: 20,
              isPublished: true,
              sortOrder: 2,
            },
            {
              title: "HTML Quiz",
              description: "Test your HTML knowledge.",
              contentType: "quiz",
              duration: 10,
              isPublished: true,
              sortOrder: 3,
            },
          ],
        },
      },
      include: { lessons: true },
    });

    // Add quiz questions for HTML quiz
    const htmlQuizLesson = htmlModule.lessons.find((l) => l.title === "HTML Quiz");
    if (htmlQuizLesson) {
      await prisma.quiz.create({
        data: {
          lessonId: htmlQuizLesson.id,
          title: "HTML Basics Quiz",
          description: "5 questions to test your understanding of HTML.",
          timeLimit: 10,
          maxAttempts: 3,
          passingScore: 60,
          isPublished: true,
          questions: {
            create: [
              {
                type: "MCQ",
                question: "What does HTML stand for?",
                options: ["HyperText Markup Language", "HighTech Modern Language", "HyperText Modern Links", "Home Tool Markup Language"],
                correctAnswer: "HyperText Markup Language",
                points: 1,
                sortOrder: 0,
              },
              {
                type: "MCQ",
                question: "Which tag is used for the largest heading?",
                options: ["<heading>", "<h6>", "<h1>", "<head>"],
                correctAnswer: "<h1>",
                points: 1,
                sortOrder: 1,
              },
              {
                type: "TRUE_FALSE",
                question: "The <a> tag is used to create links.",
                options: ["True", "False"],
                correctAnswer: "True",
                points: 1,
                sortOrder: 2,
              },
              {
                type: "MCQ",
                question: "Which attribute specifies the URL for a link?",
                options: ["src", "href", "url", "link"],
                correctAnswer: "href",
                points: 1,
                sortOrder: 3,
              },
              {
                type: "MCQ",
                question: "What is the correct tag for an image?",
                options: ["<img>", "<image>", "<pic>", "<src>"],
                correctAnswer: "<img>",
                points: 1,
                sortOrder: 4,
              },
            ],
          },
        },
      });
    }

    // Module 2: CSS Styling
    const cssModule = await prisma.module.create({
      data: {
        courseId: webCourse.id,
        title: "Module 2: CSS Styling",
        description: "Make your web pages beautiful with Cascading Style Sheets.",
        sortOrder: 1,
        isPublished: true,
        lessons: {
          create: [
            {
              title: "CSS Syntax & Selectors",
              description: "Learn how to target HTML elements with CSS.",
              contentType: "text",
              duration: 15,
              isPublished: true,
              sortOrder: 0,
            },
            {
              title: "Colors, Fonts & Backgrounds",
              description: "Styling text and backgrounds in CSS.",
              contentType: "text",
              duration: 20,
              isPublished: true,
              sortOrder: 1,
            },
            {
              title: "Box Model & Layout",
              description: "Understanding margins, padding, borders, and the box model.",
              contentType: "pdf",
              contentUrl: "/uploads/documents/css-box-model.pdf",
              duration: 25,
              isPublished: true,
              sortOrder: 2,
            },
            {
              title: "CSS Quiz",
              description: "Test your CSS skills.",
              contentType: "quiz",
              duration: 10,
              isPublished: true,
              sortOrder: 3,
            },
          ],
        },
      },
      include: { lessons: true },
    });

    const cssQuizLesson = cssModule.lessons.find((l) => l.title === "CSS Quiz");
    if (cssQuizLesson) {
      await prisma.quiz.create({
        data: {
          lessonId: cssQuizLesson.id,
          title: "CSS Fundamentals Quiz",
          description: "5 questions on CSS basics.",
          timeLimit: 10,
          maxAttempts: 3,
          passingScore: 60,
          isPublished: true,
          questions: {
            create: [
              {
                type: "MCQ",
                question: "Which property changes text color?",
                options: ["text-color", "font-color", "color", "foreground"],
                correctAnswer: "color",
                points: 1,
                sortOrder: 0,
              },
              {
                type: "MCQ",
                question: "Which selector targets elements with class 'btn'?",
                options: ["#btn", ".btn", "btn", "*btn"],
                correctAnswer: ".btn",
                points: 1,
                sortOrder: 1,
              },
              {
                type: "TRUE_FALSE",
                question: "CSS stands for Computer Style Sheets.",
                options: ["True", "False"],
                correctAnswer: "False",
                points: 1,
                sortOrder: 2,
              },
              {
                type: "MCQ",
                question: "Which property sets the space inside an element's border?",
                options: ["margin", "padding", "border-spacing", "spacing"],
                correctAnswer: "padding",
                points: 1,
                sortOrder: 3,
              },
              {
                type: "MCQ",
                question: "How do you make text bold in CSS?",
                options: ["font-style: bold", "text-weight: bold", "font-weight: bold", "bold: true"],
                correctAnswer: "font-weight: bold",
                points: 1,
                sortOrder: 4,
              },
            ],
          },
        },
      });
    }

    // Module 3: JavaScript Basics
    await prisma.module.create({
      data: {
        courseId: webCourse.id,
        title: "Module 3: JavaScript Basics",
        description: "Add interactivity to your web pages with JavaScript.",
        sortOrder: 2,
        isPublished: true,
        lessons: {
          create: [
            {
              title: "Introduction to JavaScript",
              description: "What is JS and how does it fit into web development?",
              contentType: "video",
              contentUrl: "https://www.youtube.com/embed/W6NZfCO5SIk",
              duration: 20,
              isPublished: true,
              isPreview: true,
              sortOrder: 0,
            },
            {
              title: "Variables & Data Types",
              description: "Understanding let, const, var and JS data types.",
              contentType: "text",
              duration: 25,
              isPublished: true,
              sortOrder: 1,
            },
            {
              title: "Functions & Control Flow",
              description: "Functions, conditionals, and loops in JS.",
              contentType: "text",
              duration: 30,
              isPublished: true,
              sortOrder: 2,
            },
            {
              title: "DOM Manipulation",
              description: "Selecting and modifying HTML elements with JavaScript.",
              contentType: "video",
              contentUrl: "https://www.youtube.com/embed/0ik6X4DJKCc",
              duration: 25,
              isPublished: true,
              sortOrder: 3,
            },
          ],
        },
      },
    });

    console.log(" Web Development course content seeded");
  }

  // ─── Course 2: Stock Trading (add quiz content) ───
  const stockCourse = await prisma.course.findUnique({
    where: { slug: "intro-to-stock-trading" },
  });

  if (stockCourse) {
    console.log("Seeding Stock Trading course content...");

    const stockModule = await prisma.module.create({
      data: {
        courseId: stockCourse.id,
        title: "Module 1: Stock Market Fundamentals",
        description: "Understanding how stock markets work.",
        sortOrder: 0,
        isPublished: true,
        lessons: {
          create: [
            {
              title: "What is a Stock?",
              description: "Learn what stocks represent and how companies issue them.",
              contentType: "text",
              duration: 15,
              isPublished: true,
              isPreview: true,
              sortOrder: 0,
            },
            {
              title: "How Stock Markets Work",
              description: "Exchanges, brokers, and order types explained.",
              contentType: "text",
              duration: 20,
              isPublished: true,
              sortOrder: 1,
            },
            {
              title: "Reading Stock Quotes",
              description: "Understanding ticker symbols, bid/ask, volume, and market cap.",
              contentType: "text",
              duration: 15,
              isPublished: true,
              sortOrder: 2,
            },
            {
              title: "Stock Market Quiz",
              description: "Test your knowledge of stock market basics.",
              contentType: "quiz",
              duration: 10,
              isPublished: true,
              sortOrder: 3,
            },
          ],
        },
      },
      include: { lessons: true },
    });

    const stockQuizLesson = stockModule.lessons.find((l) => l.title === "Stock Market Quiz");
    if (stockQuizLesson) {
      await prisma.quiz.create({
        data: {
          lessonId: stockQuizLesson.id,
          title: "Stock Market Basics Quiz",
          description: "5 questions on stock market fundamentals.",
          timeLimit: 10,
          maxAttempts: 3,
          passingScore: 60,
          isPublished: true,
          questions: {
            create: [
              {
                type: "MCQ",
                question: "What does owning a share of stock represent?",
                options: ["A loan to the company", "Partial ownership of the company", "A guaranteed return", "A debt obligation"],
                correctAnswer: "Partial ownership of the company",
                points: 1,
                sortOrder: 0,
              },
              {
                type: "MCQ",
                question: "Which is the largest stock exchange in the world by market cap?",
                options: ["London Stock Exchange", "Tokyo Stock Exchange", "NYSE", "NASDAQ"],
                correctAnswer: "NYSE",
                points: 1,
                sortOrder: 1,
              },
              {
                type: "TRUE_FALSE",
                question: "A bull market means stock prices are generally falling.",
                options: ["True", "False"],
                correctAnswer: "False",
                points: 1,
                sortOrder: 2,
              },
              {
                type: "MCQ",
                question: "What is the S&P 500?",
                options: ["A single stock", "An index of 500 large US companies", "A government bond", "A cryptocurrency"],
                correctAnswer: "An index of 500 large US companies",
                points: 1,
                sortOrder: 3,
              },
              {
                type: "MCQ",
                question: "What does IPO stand for?",
                options: ["Internal Profit Operation", "Initial Public Offering", "International Portfolio Option", "Investment Price Outlook"],
                correctAnswer: "Initial Public Offering",
                points: 1,
                sortOrder: 4,
              },
            ],
          },
        },
      });
    }

    // Module 2: Technical Analysis
    await prisma.module.create({
      data: {
        courseId: stockCourse.id,
        title: "Module 2: Technical Analysis",
        description: "Reading charts and identifying patterns.",
        sortOrder: 1,
        isPublished: true,
        lessons: {
          create: [
            {
              title: "Candlestick Patterns",
              description: "Learn to read candlestick charts and common patterns.",
              contentType: "text",
              duration: 25,
              isPublished: true,
              sortOrder: 0,
            },
            {
              title: "Support and Resistance",
              description: "Identifying key price levels that act as barriers.",
              contentType: "text",
              duration: 20,
              isPublished: true,
              sortOrder: 1,
            },
            {
              title: "Moving Averages",
              description: "Understanding SMA, EMA, and how traders use them.",
              contentType: "video",
              contentUrl: "https://www.youtube.com/embed/4R2CDcz6vlI",
              duration: 30,
              isPublished: true,
              sortOrder: 2,
            },
          ],
        },
      },
    });

    console.log(" Stock Trading course content seeded");
  }

  // ─── Course 3: Create a brand new Data Science course ───
  const dsCategory = await prisma.category.findFirst({ where: { slug: "programming" } });
  if (dsCategory && creatorId) {
    const dsCourse = await prisma.course.create({
      data: {
        title: "Data Science for Beginners",
        slug: "data-science-for-beginners",
        description: "Learn the fundamentals of data science: data collection, cleaning, analysis, visualization, and basic machine learning using Python.",
        shortDesc: "Your first step into the world of data",
        status: "PUBLISHED",
        price: 39.99,
        currency: "USD",
        isFree: false,
        level: "BEGINNER",
        duration: 1800,
        language: "en",
        prerequisites: ["Basic Python knowledge is helpful but not required"],
        learningOutcomes: [
          "Collect and clean data using Python",
          "Perform exploratory data analysis",
          "Create compelling data visualizations",
          "Build your first machine learning model",
          "Understand data ethics and privacy",
        ],
        tags: ["data-science", "python", "machine-learning", "analytics"],
        publishedAt: new Date(),
        instructorId: creatorId,
        categoryId: dsCategory.id,
      },
    });

    console.log("Created Data Science course:", dsCourse.title);

    // Module 1
    await prisma.module.create({
      data: {
        courseId: dsCourse.id,
        title: "Module 1: Introduction to Data Science",
        description: "What is data science and why does it matter?",
        sortOrder: 0,
        isPublished: true,
        lessons: {
          create: [
            {
              title: "What is Data Science?",
              description: "Overview of the data science lifecycle and key roles.",
              contentType: "video",
              contentUrl: "https://www.youtube.com/embed/ua-CiDNNj8w",
              duration: 18,
              isPublished: true,
              isPreview: true,
              sortOrder: 0,
            },
            {
              title: "Setting Up Your Environment",
              description: "Installing Python, Jupyter Notebook, and essential libraries.",
              contentType: "text",
              duration: 20,
              isPublished: true,
              sortOrder: 1,
            },
            {
              title: "Python for Data Science: NumPy",
              description: "Working with arrays and numerical operations.",
              contentType: "text",
              duration: 30,
              isPublished: true,
              sortOrder: 2,
            },
          ],
        },
      },
      include: { lessons: true },
    });

    // Module 2
    await prisma.module.create({
      data: {
        courseId: dsCourse.id,
        title: "Module 2: Data Analysis with Pandas",
        description: "Manipulate and analyze tabular data like a pro.",
        sortOrder: 1,
        isPublished: true,
        lessons: {
          create: [
            {
              title: "Pandas DataFrames",
              description: "Creating, indexing, and filtering data.",
              contentType: "text",
              duration: 25,
              isPublished: true,
              sortOrder: 0,
            },
            {
              title: "Data Cleaning Techniques",
              description: "Handling missing values, duplicates, and outliers.",
              contentType: "text",
              duration: 30,
              isPublished: true,
              sortOrder: 1,
            },
            {
              title: "Data Analysis Quiz",
              description: "Test your Pandas knowledge.",
              contentType: "quiz",
              duration: 15,
              isPublished: true,
              sortOrder: 2,
            },
          ],
        },
      },
      include: { lessons: true },
    });

    // Module 3
    await prisma.module.create({
      data: {
        courseId: dsCourse.id,
        title: "Module 3: Data Visualization",
        description: "Tell stories with your data through charts and plots.",
        sortOrder: 2,
        isPublished: true,
        lessons: {
          create: [
            {
              title: "Matplotlib Basics",
              description: "Line plots, bar charts, scatter plots, and histograms.",
              contentType: "text",
              duration: 25,
              isPublished: true,
              sortOrder: 0,
            },
            {
              title: "Seaborn for Statistical Plots",
              description: "Heatmaps, pair plots, and distribution plots.",
              contentType: "text",
              duration: 20,
              isPublished: true,
              sortOrder: 1,
            },
            {
              title: "Building a Dashboard",
              description: "Creating interactive visualizations.",
              contentType: "video",
              contentUrl: "https://www.youtube.com/embed/0mfDeMwP6vU",
              duration: 35,
              isPublished: true,
              sortOrder: 2,
            },
          ],
        },
      },
    });

    console.log(" Data Science course seeded");
  }

  console.log(" All course content seeded successfully!");
}

seedContent()
  .catch((e) => {
    console.error("Content seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
