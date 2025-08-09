#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h> // For sleep and usleep functions
#include <time.h>    // For nanosleep

// --- Color Definitions ---
#define COLOR_RESET   "\x1B[0m"
#define COLOR_RED     "\x1B[31m"
#define COLOR_GREEN   "\x1B[32m"
#define COLOR_YELLOW  "\x1B[33m"
#define COLOR_BLUE    "\x1B[34m"
#define COLOR_MAGENTA "\x1B[35m"
#define COLOR_CYAN    "\x1B[36m"
#define COLOR_WHITE   "\x1B[37m"
#define BOLD        "\x1B[1m"
#define UNDERLINE   "\x1B[4m"

// --- Model ---
typedef struct {
    int id;
    char name[50];
    int thrill;
    int duration;
    int queueTime;
    int fatigue;
    bool mandatory;
    bool restricted;
    bool vipAccess;
    bool affectedByWeather;
} Ride;

typedef struct {
    Ride* rides;
    int rideCount;
    int totalTime;
    int fatigueLimit;
    bool isVIP;
    bool badWeather;
} ParkModel;

typedef struct {
    int* selectedRides;
    int selectedCount;
    int totalThrill;
    int remainingTime;
    int remainingFatigue;
} PlanModel;

typedef struct {
    int index;
    int priority;
} HeapNode;

typedef struct {
    HeapNode* arr;
    int size;
    int capacity;
} MaxHeap;

// --- Model Functions ---
void initializeModel(ParkModel* model, int totalTime, int fatigueLimit, bool isVIP, bool badWeather);
void addRide(ParkModel* model, int id, const char* name, int thrill, int duration, int queueTime,
             int fatigue, bool mandatory, bool restricted, bool vipAccess, bool affectedByWeather);
void addDefaultRides(ParkModel* model);
void freeModel(ParkModel* model);

MaxHeap* createHeap(int capacity);
void swap(HeapNode* a, HeapNode* b);
void heapify(MaxHeap* heap, int i);
void insertHeap(MaxHeap* heap, int index, int priority);
HeapNode extractMax(MaxHeap* heap);
void freeHeap(MaxHeap* heap);

PlanModel* generateOptimalPlan(ParkModel* model);
void freePlan(PlanModel* plan);

// --- View ---
void displayBanner();
void displayMenu();
void displayRides(ParkModel* model); // Modified function
void displayPlan(ParkModel* model, PlanModel* plan);
void displayModelDetails(ParkModel* model);
void showProgressBar();
void displayThrillMeter(int thrill);
void clearScreen();
void simulatePlan(ParkModel* model, PlanModel* plan);

// --- Controller ---
void getStringInput(char *buffer, int size, const char *prompt);
int getIntInput(const char *prompt, int min, int max);
void handleAddRide(ParkModel* model);
void handleDisplayRides(ParkModel* model);
void handleDisplaySettings(ParkModel* model);
void handleGeneratePlan(ParkModel* model);

// --- Main ---
int main() {
    ParkModel model;
    int choice;
    int totalTime, fatigueLimit;
    int isVIP_int, badWeather_int;
    bool isVIP, badWeather;

    clearScreen();
    displayBanner();

    printf("%s%s=== Theme Park Ride Optimizer ===%s\n", BOLD, COLOR_CYAN, COLOR_RESET);
    totalTime = getIntInput("Enter total available time (minutes)", 1, 1000);
    fatigueLimit = getIntInput("Enter maximum fatigue limit", 1, 100);
    isVIP_int = getIntInput("Do you have VIP access? (1-Yes, 0-No)", 0, 1);
    isVIP = (isVIP_int == 1);
    badWeather_int = getIntInput("Is the weather bad today? (1-Yes, 0-No)", 0, 1);
    badWeather = (badWeather_int == 1);

    initializeModel(&model, totalTime, fatigueLimit, isVIP, badWeather);
    addDefaultRides(&model);

    while (1) {
        displayMenu();
        choice = getIntInput("Enter your choice", 1, 5);

        switch (choice) {
            case 1:
                clearScreen();
                handleAddRide(&model);
                break;
            case 2:
                clearScreen();
                handleDisplayRides(&model);
                printf("\nPress Enter to continue...");
                getchar(); getchar();
                break;
            case 3:
                clearScreen();
                handleDisplaySettings(&model);
                printf("\nPress Enter to continue...");
                getchar(); getchar();
                break;
            case 4:
                clearScreen();
                handleGeneratePlan(&model);
                printf("\nPress Enter to continue...");
                getchar(); getchar();
                break;
            case 5:
                clearScreen();
                printf("%s%sThank you for using Theme Park Ride Optimizer!%s\n", BOLD, COLOR_GREEN, COLOR_RESET);
                freeModel(&model);
                return 0;
            default:
                printf("%sInvalid choice. Please try again.%s\n", COLOR_RED, COLOR_RESET);
        }
        clearScreen();
    }

    return 0;
}

// --- Model Functions Implementation ---
void initializeModel(ParkModel* model, int totalTime, int fatigueLimit, bool isVIP, bool badWeather) {
    model->rides = NULL;
    model->rideCount = 0;
    model->totalTime = totalTime;
    model->fatigueLimit = fatigueLimit;
    model->isVIP = isVIP;
    model->badWeather = badWeather;
}

void addRide(ParkModel* model, int id, const char* name, int thrill, int duration, int queueTime,
             int fatigue, bool mandatory, bool restricted, bool vipAccess, bool affectedByWeather) {
    model->rides = (Ride*)realloc(model->rides, (model->rideCount + 1) * sizeof(Ride));
    if (model->rides == NULL) {
        perror("Failed to allocate memory for new ride");
        exit(EXIT_FAILURE);
    }

    Ride* newRide = &model->rides[model->rideCount];
    newRide->id = id;
    strncpy(newRide->name, name, sizeof(newRide->name) - 1);
    newRide->name[sizeof(newRide->name) - 1] = '\0';
    newRide->thrill = thrill;
    newRide->duration = duration;
    newRide->queueTime = queueTime;
    newRide->fatigue = fatigue;
    newRide->mandatory = mandatory;
    newRide->restricted = restricted;
    newRide->vipAccess = vipAccess;
    newRide->affectedByWeather = affectedByWeather;

    model->rideCount++;
    printf("Ride '%s' added successfully!\n", name);
}

void addDefaultRides(ParkModel* model) {
    // Wonderla Hyderabad rides
    addRide(model, 101, "Recoil", 10, 3, 30, 5, false, false, true, false);
    addRide(model, 102, "Drop Zone", 9, 2, 25, 4, false, false, true, true);
    addRide(model, 103, "Wave Pool", 6, 30, 15, 3, false, false, true, true);
    addRide(model, 104, "Y-Scream", 8, 5, 20, 4, false, false, true, false);

    // Wild Waters rides
    addRide(model, 201, "Multi Lane Racer", 7, 5, 25, 3, false, false, true, true);
    addRide(model, 202, "Crazy Cruise", 8, 10, 20, 4, false, false, true, false);
    addRide(model, 203, "Boomerang", 9, 4, 35, 5, false, false, true, false); // Changed restricted to false
}

void freeModel(ParkModel* model) {
    free(model->rides);
    model->rides = NULL;
    model->rideCount = 0;
}

MaxHeap* createHeap(int capacity);
void swap(HeapNode* a, HeapNode* b);
void heapify(MaxHeap* heap, int i);
void insertHeap(MaxHeap* heap, int index, int priority);
HeapNode extractMax(MaxHeap* heap);
void freeHeap(MaxHeap* heap);

PlanModel* generateOptimalPlan(ParkModel* model);
void freePlan(PlanModel* plan);
// --- View Functions Implementation ---
void displayBanner() {
    printf("%s%s", COLOR_CYAN, BOLD);
    printf("\n");
    printf("    #########################################################################\n");
    printf("    #                                                                       #\n");
    printf("    #        ████████╗██╗   ██╗███████╗███╗   ███╗███████╗                 #\n");
    printf("    #        ╚══██╔══╝██║   ██║██╔════╝████╗ ████║██╔════╝                 #\n");
    printf("    #           ██║   ███████║█████╗  ██╔████╔██║█████╗                   #\n");
    printf("    #           ██║   ██╔══██║██╔══╝  ██║╚██╔╝██║██╔══╝                   #\n");
    printf("    #           ██║   ██║   ██║███████╗██║ ╚═╝ ██║███████╗                 #\n");
    printf("    #           ╚═╝   ╚═╝   ╚═╝╚══════╝╚═╝     ╚═╝╚══════╝                 #\n");
    printf("    #                                                                       #\n");
    printf("    #########################################################################\n");
    printf("\n");
    printf("                   ######################################################\n");
    printf("                  #                                                    #\n");
    printf("                  #   ██████╗ ██████╗ ████████╗██╗███╗   ███╗██╗███████╗ #\n");
    printf("                  #  ██╔═══██╗██╔══██╗╚══██╔══╝██║████╗ ████║██║╚══███╔╝ #\n");
    printf("                  #  ██║   ██║██████╔╝   ██║   ██║██╔████╔██║██║  ███╔╝  #\n");
    printf("                  #  ██║   ██║██╔═══╝    ██║   ██║██║╚██╔╝██║██║ ███╔╝   #\n");
    printf("                  #  ╚██████╔╝██║        ██║   ██║██║ ╚═╝ ██║██║███████╗ #\n");
    printf("                  #   ╚═════╝ ╚═╝        ╚═╝   ╚═╝╚═╝     ╚═╝╚═╝╚══════╝ #\n");
    printf("                  #                                                    #\n");
    printf("                   ######################################################\n");
    printf("%s\n", COLOR_RESET);
}

void displayMenu() {
    printf("\n%s%s=== Theme Park Ride Optimizer Menu ===%s\n", BOLD, COLOR_CYAN, COLOR_RESET);
    printf("%s1.%s Add a new ride\n", COLOR_YELLOW, COLOR_RESET);
    printf("%s2.%s Display all rides\n", COLOR_YELLOW, COLOR_RESET);
    printf("%s3.%s Display park settings\n", COLOR_YELLOW, COLOR_RESET);
    printf("%s4.%s Generate optimal ride plan\n", COLOR_YELLOW, COLOR_RESET);
    printf("%s5.%s Exit\n", COLOR_YELLOW, COLOR_RESET);
    printf("---------------------------------------\n");
}

void displayRides(ParkModel* model) {
    printf("\n%s%s=== Available Rides ===%s\n", BOLD, COLOR_CYAN, COLOR_RESET);
    if (model->rideCount == 0) {
        printf("%sNo rides available.%s\n", COLOR_YELLOW, COLOR_RESET);
        return;
    }
    printf("+-----+-------------------------+--------+----------+-------+---------+-----+---------+\n");
    printf("| ID  | Name                    | Thrill | Duration | Queue | Fatigue | VIP | Weather |\n");
    printf("+-----+-------------------------+--------+----------+-------+---------+-----+---------+\n");
    for (int i = 0; i < model->rideCount; i++) {
        printf("| %-3d | %-25s | %-6d ",
               model->rides[i].id, model->rides[i].name, model->rides[i].thrill);
        if (model->rides[i].thrill > 7) printf("%s", COLOR_RED);
        else if (model->rides[i].thrill > 4) printf("%s", COLOR_YELLOW);
        else printf("%s", COLOR_GREEN);
        printf("%-2d%s | %-8d | %-5d | %-7d | %-3s | %-7s |\n",
               model->rides[i].thrill, COLOR_RESET, model->rides[i].duration,
               model->rides[i].queueTime, model->rides[i].fatigue,
               model->rides[i].vipAccess ? "Yes" : "No",
               model->rides[i].affectedByWeather ? "Yes" : "No");
    }
    printf("+-----+-------------------------+--------+----------+-------+---------+-----+---------+\n");
}

void displayPlan(ParkModel* model, PlanModel* plan) {
    printf("\n%s%s=== Optimal Ride Plan ===%s\n", BOLD, COLOR_GREEN, COLOR_RESET);
    if (plan->selectedCount == 0) {
        printf("%sNo rides could be scheduled within the given constraints.%s\n", COLOR_YELLOW, COLOR_RESET);
        return;
    }
    printf("Selected Rides:\n");
    printf("Order | Name                    | Thrill | Duration | Queue Time | VIP Queue\n");
    printf("---------------------------------------------------------------------------\n");
    for (int i = 0; i < plan->selectedCount; i++) {
        int rideIndex = plan->selectedRides[i];
        int adjustedQueueTime = (model->isVIP && model->rides[rideIndex].vipAccess)
                                    ? model->rides[rideIndex].queueTime / 2
                                    : model->rides[rideIndex].queueTime;
        printf("%-5d | %-25s | %-6d | %-8d | %-10d | %-9d\n",
               i + 1, model->rides[rideIndex].name, model->rides[rideIndex].thrill,
               model->rides[rideIndex].duration, model->rides[rideIndex].queueTime, adjustedQueueTime);
    }
    printf("\nTotal Thrill Score: %s%d%s\n", BOLD, plan->totalThrill, COLOR_RESET);
    printf("Time remaining: %s%d%s minutes\n", BOLD, plan->remainingTime, COLOR_RESET);
    printf("Fatigue remaining: %s%d/%d%s\n", BOLD, plan->remainingFatigue, model->fatigueLimit, COLOR_RESET);

    int simulate;
    simulate = getIntInput("Would you like to see a simulation of your day? (1-Yes, 0-No)", 0, 1);
    if (simulate == 1) {
        simulatePlan(model, plan);
    }
}

void displayModelDetails(ParkModel* model) {
    printf("\n%s%s=== Park Settings ===%s\n", BOLD, COLOR_CYAN, COLOR_RESET);
    printf("Total Time Available: %s%d%s minutes\n", BOLD, model->totalTime, COLOR_RESET);
    printf("Maximum Fatigue Limit: %s%d%s\n", BOLD, model->fatigueLimit, COLOR_RESET);
    printf("VIP Access: %s%s%s\n", BOLD, model->isVIP ? "Yes" : "No", COLOR_RESET);
    printf("Bad Weather: %s%s%s\n", BOLD, model->badWeather ? "Yes" : "No", COLOR_RESET);
}

void showProgressBar() {
    printf("Generating optimal plan...\n");
    printf("[");
    for (int i = 0; i < 20; i++) {
        struct timespec req;
        req.tv_sec = 0;
        req.tv_nsec = 50000 * 1000;
        nanosleep(&req, NULL); // Simulate work
        printf("=");
        fflush(stdout);
    }
    printf("] Done!\n");
}

void displayThrillMeter(int thrill) {
    printf("THRILL [");
    for (int i = 0; i < 10; i++) {
        if (i < thrill) {
            printf("%s#%s", COLOR_RED, COLOR_RESET);
        } else {
            printf(" ");
        }
    }
    printf("] %d/10\n", thrill);
}

void clearScreen() {
#ifdef _WIN32
    system("cls");
#else
    printf("\033[2J\033[1;1H");
#endif
}

void simulatePlan(ParkModel* model, PlanModel* plan) {
    printf("\n%s%sSimulating your day at the park...%s\n", BOLD, COLOR_GREEN, COLOR_RESET);
    int currentTime = 0;
    int currentFatigue = 0;
    struct timespec req;

    for (int i = 0; i < plan->selectedCount; i++) {
        int rideIndex = plan->selectedRides[i];
        int adjustedQueueTime = (model->isVIP && model->rides[rideIndex].vipAccess)
                                    ? model->rides[rideIndex].queueTime / 2
                                    : model->rides[rideIndex].queueTime;
        int totalRideTime = model->rides[rideIndex].duration + adjustedQueueTime;

        printf("\n[%02d:%02d] Heading to %s...\n", currentTime / 60, currentTime % 60, model->rides[rideIndex].name);
        printf("Waiting in queue...\n");
        req.tv_sec = (adjustedQueueTime * 10000) / 1000000;
        req.tv_nsec = ((adjustedQueueTime * 10000) % 1000000) * 1000;
        nanosleep(&req, NULL); // Simulate queue time

        printf("Riding %s!!!\n", model->rides[rideIndex].name);
        displayThrillMeter(model->rides[rideIndex].thrill);
        currentFatigue += model->rides[rideIndex].fatigue;
        printf("Fatigue: [");
        for (int j = 0; j < model->fatigueLimit; j += model->fatigueLimit / 10) {
            if (currentFatigue > j) {
                printf("%s#%s", COLOR_MAGENTA, COLOR_RESET);
            } else {
                printf(" ");
            }
        }
        printf("] %d/%d\n", currentFatigue, model->fatigueLimit);
        req.tv_sec = (model->rides[rideIndex].duration * 10000) / 1000000;
        req.tv_nsec = ((model->rides[rideIndex].duration * 10000) % 1000000) * 1000;
        nanosleep(&req, NULL); // Simulate ride duration

        currentTime += totalRideTime;
    }

    printf("\nDay completed!\n");
    printf("Total time spent: %d minutes\n", currentTime);
    printf("Final fatigue level: %d/%d\n", currentFatigue, model->fatigueLimit);
}

// --- Controller Functions Implementation ---
void getStringInput(char *buffer, int size, const char *prompt) {
    printf("%s: ", prompt);
    if (fgets(buffer, size, stdin) != NULL) {
        buffer[strcspn(buffer, "\n")] = 0; // Remove trailing newline
    } else {
        // Handle input error
        buffer[0] = '\0';
    }
}

int getIntInput(const char *prompt, int min, int max) {
    int value;
    char buffer[100];
    while (1) {
        getStringInput(buffer, sizeof(buffer), prompt);
        if (sscanf(buffer, "%d", &value) == 1 && value >= min && value <= max) {
            return value;
        } else {
            printf("%sInvalid input. Please enter a number between %d and %d.%s\n", COLOR_RED, min, max, COLOR_RESET);
        }
    }
}

void handleAddRide(ParkModel* model) {
    int id, thrill, duration, queueTime, fatigue;
    char name[50];
    int mandatory_int, restricted_int, vipAccess_int, affectedByWeather_int;
    bool mandatory, restricted, vipAccess, affectedByWeather;

    printf("%s%s=== Add New Ride ===%s\n", BOLD, COLOR_YELLOW, COLOR_RESET);
    id = getIntInput("Enter ride ID", 1, 999);
    getStringInput(name, sizeof(name), "Enter ride name");
    thrill = getIntInput("Enter thrill level (1-10)", 1, 10);
    duration = getIntInput("Enter ride duration (minutes)", 1, 60);
    queueTime = getIntInput("Enter typical queue time (minutes)", 0, 120);
    fatigue = getIntInput("Enter fatigue cost of the ride", 1, 20);
    mandatory_int = getIntInput("Is this a mandatory ride? (1-Yes, 0-No)", 0, 1);
    mandatory = (mandatory_int == 1);
    restricted_int = getIntInput("Is this ride restricted? (1-Yes, 0-No)", 0, 1);
    restricted = (restricted_int == 1);
    vipAccess_int = getIntInput("Does this ride have VIP access? (1-Yes, 0-No)", 0, 1);
    vipAccess = (vipAccess_int == 1);
    affectedByWeather_int = getIntInput("Is this ride affected by bad weather? (1-Yes, 0-No)", 0, 1);
    affectedByWeather = (affectedByWeather_int == 1);

    addRide(model, id, name, thrill, duration, queueTime, fatigue, mandatory, restricted, vipAccess, affectedByWeather);
}

void handleDisplayRides(ParkModel* model) {
    displayRides(model);
}

void handleDisplaySettings(ParkModel* model) {
    displayModelDetails(model);
}

void handleGeneratePlan(ParkModel* model) {
    showProgressBar();
    PlanModel* plan = generateOptimalPlan(model);
    displayPlan(model, plan);
    freePlan(plan);
}