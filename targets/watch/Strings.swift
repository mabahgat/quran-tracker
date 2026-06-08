import Foundation

/// The handful of static UI words the watch shows. Data labels (goal, position,
/// projection…) arrive already localized from the phone; only these fixed words
/// live here, keyed by the phone's language so the watch needs no real i18n.
struct WatchStrings {
    let today: String
    let goal: String
    let progress: String
    let full: String
    let partial: String
    let missed: String
    let save: String
    let cancel: String
    let verses: String
    let noPlanTitle: String
    let noPlanBody: String
    let loggedToday: String
    let defaultTag: String

    static func of(_ language: String) -> WatchStrings {
        if language == "ar" {
            return WatchStrings(
                today: "اليوم",
                goal: "الهدف",
                progress: "التقدم",
                full: "كامل",
                partial: "جزئي",
                missed: "فائت",
                save: "حفظ",
                cancel: "إلغاء",
                verses: "آية",
                noPlanTitle: "لا توجد خطة",
                noPlanBody: "افتح التطبيق على الـ iPhone وأنشئ خطة.",
                loggedToday: "تم تسجيل اليوم",
                defaultTag: "افتراضية"
            )
        }
        return WatchStrings(
            today: "Today",
            goal: "Goal",
            progress: "Progress",
            full: "Full",
            partial: "Partial",
            missed: "Missed",
            save: "Save",
            cancel: "Cancel",
            verses: "verses",
            noPlanTitle: "No plan",
            noPlanBody: "Open the app on your iPhone and create a plan.",
            loggedToday: "Logged today",
            defaultTag: "Default"
        )
    }
}
