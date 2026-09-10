# Planner calendar vs Calendar page

`PlannerCalendar` is shared by **「我的选课」** (`variant="embedded"`) and **「我的日历」** (`variant="page"`). Treat them as **separate UI modules**.

Unless a change **explicitly** says「该改动对“我的选课”和“我的日历”界面均适用。」, do **not** sync UI behaviour between the two surfaces by default. Shared data (selections, enrollment / waitlist status, ICS format templates, etc.) still applies to both.

Examples of intentional surface differences: Teaching Plan previous-plan overlay + change navigation (Planner only); Waiting courses shown with a **W** badge on Planner but hidden on My Calendar.
