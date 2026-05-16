import { StorageWidgetSidebar } from './storage-widget-sidebar'
import { EmailWidgetSidebar } from './email-widget-sidebar'

export async function FooterSidebar() {
  return (
    <div className="mt-auto pb-1 space-y-1">
      <EmailWidgetSidebar />
      <StorageWidgetSidebar />
    </div>
  )
}
