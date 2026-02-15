import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityItem } from "@/services/activity";

interface ActivityFeedProps {
    activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest system events and user actions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
            {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
                activities.map((item) => (
                    <div className="flex items-center" key={item.id}>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {item.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {item.description}
                            </p>
                        </div>
                        <div className="ml-auto font-medium text-xs text-muted-foreground">
                            {item.timeAgo}
                        </div>
                    </div>
                ))
            )}
        </div>
      </CardContent>
    </Card>
  )
}
