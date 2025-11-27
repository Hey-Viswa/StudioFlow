// Add these modals at the end of ProjectDetail.jsx, before the closing </div> and after Delete Confirmation Modal

      {/* Request Revision Modal */}
      {showRevisionModal && (
        <Dialog open={showRevisionModal} onOpenChange={setShowRevisionModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Revision</DialogTitle>
              <DialogDescription>
                Explain what needs to be changed or improved in this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Describe the changes you'd like to see..."
                className="min-h-[120px]"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {revisionNotes.length}/500 characters
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevisionModal(false);
                  setRevisionNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={requestRevision}
                disabled={!revisionNotes.trim() || submittingRevision}
              >
                {submittingRevision ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Approve Final Modal */}
      {showApproveModal && (
        <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Final Version</DialogTitle>
              <DialogDescription>
                Confirm that you approve the final version of {project?.title}. This will mark the project as completed.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Final Approval</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  By approving, you confirm that all requirements have been met and the project is complete.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={approveFinal}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Final
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
