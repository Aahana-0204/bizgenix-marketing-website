import type { OutboxRepository, Delivery } from "@/domain/models";
import { backoff } from "@/lib/security";
export class ProcessOutbox {
  constructor(
    private jobs: OutboxRepository,
    private delivery: Delivery,
    private alert: (jobId: string) => void,
  ) {}
  async execute() {
    const jobs = await this.jobs.claim(5);
    let completed = 0;
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await this.delivery.send(job);
          await this.jobs.complete(job);
          completed++;
        } catch {
          const delay = backoff(job.attempts);
          await this.jobs.retry(job, delay);
          if (delay === null) this.alert(job.id);
        }
      }),
    );
    return { processed: jobs.length, completed };
  }
}
