"use client";

import { useState } from "react";
import { JobsList, type JobListItem } from "./JobsList";
import { JobsToolbar } from "./JobsToolbar";

type JobsWorkspaceProps = {
  canAssignRecords: boolean;
  canCreateRecords: boolean;
  canDeleteRecords: boolean;
  currentMemberId: string | null;
  jobs: JobListItem[];
};

export function JobsWorkspace({
  canAssignRecords,
  canCreateRecords,
  canDeleteRecords,
  currentMemberId,
  jobs,
}: JobsWorkspaceProps) {
  const [localJobs, setLocalJobs] = useState(jobs);

  function prependJob(job: JobListItem) {
    setLocalJobs((current) => [job, ...current]);
  }

  function updateJob(job: JobListItem) {
    setLocalJobs((current) =>
      current.map((currentJob) => (currentJob.id === job.id ? job : currentJob)),
    );
  }

  function removeDeletedJobs(jobIds: string[]) {
    const deletedIds = new Set(jobIds);
    setLocalJobs((current) =>
      current.filter((job) => !deletedIds.has(job.id)),
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <JobsToolbar
        canAssignRecords={canAssignRecords}
        canCreateRecords={canCreateRecords}
        onJobCreated={prependJob}
      />
      <JobsList
        canAssignRecords={canAssignRecords}
        canCreateRecords={canCreateRecords}
        canDeleteRecords={canDeleteRecords}
        currentMemberId={currentMemberId}
        jobs={localJobs}
        onJobCreated={prependJob}
        onJobUpdated={updateJob}
        onJobsDeleted={removeDeletedJobs}
      />
    </div>
  );
}
