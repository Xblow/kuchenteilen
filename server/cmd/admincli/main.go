package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"text/tabwriter"
	"time"
)

// ---- config ----

type config struct {
	Server string `json:"server"`
	Token  string `json:"token"` // group access token (stored after group create / set-token)
}

var (
	cfg     config
	cfgPath string
)

func loadConfig() {
	home, _ := os.UserHomeDir()
	cfgPath = filepath.Join(home, ".config", "kuchenteilen.json")
	cfg.Server = "http://localhost:8080"
	data, err := os.ReadFile(cfgPath)
	if err == nil {
		json.Unmarshal(data, &cfg) //nolint
	}
}

func saveConfig() {
	os.MkdirAll(filepath.Dir(cfgPath), 0700) //nolint
	data, _ := json.MarshalIndent(cfg, "", "  ")
	os.WriteFile(cfgPath, data, 0600) //nolint
}

// ---- HTTP helpers ----

func apiURL(path string) string {
	return strings.TrimRight(cfg.Server, "/") + "/api" + path
}

func request(method, path string, body any) ([]byte, int) {
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, apiURL(path), r)
	if err != nil {
		fatalf("failed to build request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	return raw, resp.StatusCode
}

func doObj(method, path string, body any) map[string]any {
	raw, status := request(method, path, body)
	if status >= 400 {
		var obj map[string]any
		json.Unmarshal(raw, &obj) //nolint
		msg := fmt.Sprintf("HTTP %d", status)
		if obj != nil {
			if e, ok := obj["error"].(string); ok {
				msg = e
			}
		}
		fatalf("%s", msg)
	}
	if len(raw) == 0 {
		return nil
	}
	var obj map[string]any
	json.Unmarshal(raw, &obj) //nolint
	return obj
}

func doArr(method, path string, body any) []any {
	raw, status := request(method, path, body)
	if status >= 400 {
		var obj map[string]any
		json.Unmarshal(raw, &obj) //nolint
		msg := fmt.Sprintf("HTTP %d", status)
		if obj != nil {
			if e, ok := obj["error"].(string); ok {
				msg = e
			}
		}
		fatalf("%s", msg)
	}
	var arr []any
	json.Unmarshal(raw, &arr) //nolint
	return arr
}

func groupPath(token, sub string) string {
	return "/groups/" + token + sub
}

func activeToken(args []string) string {
	if len(args) > 0 && args[0] != "" {
		return args[0]
	}
	if cfg.Token != "" {
		return cfg.Token
	}
	fatalf("no group token provided — pass it as first argument or use: kt set-token <token>")
	return ""
}

func sval(m map[string]any, key string) string {
	v, _ := m[key].(string)
	return v
}

func dollars(m map[string]any, key string) string {
	v, _ := m[key].(float64)
	return fmt.Sprintf("$%.2f", v/100)
}

func parseDollars(s string) int64 {
	f, err := strconv.ParseFloat(strings.TrimPrefix(s, "$"), 64)
	if err != nil {
		fatalf("invalid amount %q: expected dollars like 12.50", s)
	}
	return int64(math.Round(f * 100))
}

func newTable() *tabwriter.Writer {
	return tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "error: "+format+"\n", args...)
	os.Exit(1)
}

// ---- commands ----

func cmdSetToken(args []string) {
	if len(args) < 1 {
		fatalf("usage: kt set-token <access-token>")
	}
	cfg.Token = args[0]
	saveConfig()
	fmt.Println("token saved")
}

func cmdGroupCreate(args []string) {
	if len(args) < 1 {
		fatalf("usage: kt group create <name> [--desc <text>] [--currency USD]")
	}
	name := args[0]
	fs := flag.NewFlagSet("group create", flag.ExitOnError)
	desc := fs.String("desc", "", "group description")
	currency := fs.String("currency", "USD", "currency code")
	fs.Parse(args[1:]) //nolint
	g := doObj("POST", "/groups", map[string]any{"name": name, "description": *desc, "currency": *currency})
	token := sval(g, "access_token")
	cfg.Token = token
	saveConfig()
	fmt.Printf("created group  name: %s  id: %s\naccess_token: %s\n(token saved)\n", sval(g, "name"), sval(g, "id"), token)
}

func cmdGroupGet(args []string) {
	token := activeToken(args)
	g := doObj("GET", groupPath(token, ""), nil)
	fmt.Printf("id:           %s\nname:         %s\ncurrency:     %s\ndesc:         %s\naccess_token: %s\n",
		sval(g, "id"), sval(g, "name"), sval(g, "currency"), sval(g, "description"), sval(g, "access_token"))
}

func cmdGroupRotate(args []string) {
	token := activeToken(args)
	result := doObj("POST", groupPath(token, "/rotate"), nil)
	newToken := sval(result, "access_token")
	cfg.Token = newToken
	saveConfig()
	fmt.Printf("new access_token: %s\n(token saved)\n", newToken)
}

func cmdParticipants(args []string) {
	token := activeToken(args)
	list := doArr("GET", groupPath(token, "/participants"), nil)
	w := newTable()
	fmt.Fprintln(w, "ID\tNAME")
	for _, item := range list {
		m := item.(map[string]any)
		fmt.Fprintf(w, "%s\t%s\n", sval(m, "id"), sval(m, "name"))
	}
	w.Flush()
}

func cmdParticipantAdd(args []string) {
	if len(args) < 2 {
		fatalf("usage: kt participant add <token> <name>")
	}
	token, name := args[0], args[1]
	p := doObj("POST", groupPath(token, "/participants"), map[string]any{"name": name})
	fmt.Printf("created participant  id: %s  name: %s\n", sval(p, "id"), sval(p, "name"))
}

func cmdParticipantDelete(args []string) {
	if len(args) < 2 {
		fatalf("usage: kt participant delete <token> <participant-id>")
	}
	token, pid := args[0], args[1]
	request("DELETE", groupPath(token, "/participants/"+pid), nil)
	fmt.Println("deleted")
}

func cmdExpenses(args []string) {
	token := activeToken(args)
	list := doArr("GET", groupPath(token, "/expenses"), nil)
	w := newTable()
	fmt.Fprintln(w, "RECORD_ID\tDESCRIPTION\tAMOUNT\tDATE\tPAID_BY")
	for _, item := range list {
		m := item.(map[string]any)
		date := sval(m, "date")
		if len(date) > 10 {
			date = date[:10]
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n",
			sval(m, "record_id"), sval(m, "description"), dollars(m, "amount_cents"), date, sval(m, "paid_by_id"))
	}
	w.Flush()
}

func cmdExpenseAdd(args []string) {
	if len(args) < 1 {
		fatalf("usage: kt expense add <token> --paid-by <participant-id> --desc <text> --amount <dollars>\n" +
			"         [--split-type equal] --participants pid1,pid2,pid3\n" +
			"         [--split-type exact] --splits pid1:40.00,pid2:20.00")
	}
	token := args[0]
	fs := flag.NewFlagSet("expense add", flag.ExitOnError)
	paidBy := fs.String("paid-by", "", "participant ID of who paid (required)")
	desc := fs.String("desc", "", "description (required)")
	amountStr := fs.String("amount", "", "total amount in dollars e.g. 120.00 (required)")
	currency := fs.String("currency", "USD", "currency code")
	dateStr := fs.String("date", time.Now().Format("2006-01-02"), "date YYYY-MM-DD")
	splitType := fs.String("split-type", "equal", "split mode: equal or exact")
	participants := fs.String("participants", "", "comma-separated participant IDs for equal split")
	splits := fs.String("splits", "", "comma-separated pid:dollars for exact split e.g. pid1:40.00,pid2:20.00")
	fs.Parse(args[1:]) //nolint

	if *paidBy == "" || *desc == "" || *amountStr == "" {
		fatalf("--paid-by, --desc, and --amount are required")
	}
	amount := parseDollars(*amountStr)
	date, err := time.Parse("2006-01-02", *dateStr)
	if err != nil {
		fatalf("invalid date, use YYYY-MM-DD")
	}

	var splitInputs []map[string]any
	switch *splitType {
	case "equal":
		if *participants == "" {
			fatalf("--participants required for equal split e.g. --participants pid1,pid2,pid3")
		}
		for _, pid := range strings.Split(*participants, ",") {
			if pid = strings.TrimSpace(pid); pid != "" {
				splitInputs = append(splitInputs, map[string]any{"participant_id": pid})
			}
		}
	case "exact":
		if *splits == "" {
			fatalf("--splits required for exact split e.g. --splits pid1:40.00,pid2:20.00")
		}
		for _, part := range strings.Split(*splits, ",") {
			part = strings.TrimSpace(part)
			idx := strings.LastIndex(part, ":")
			if idx < 0 {
				fatalf("invalid split entry %q, expected pid:amount", part)
			}
			splitInputs = append(splitInputs, map[string]any{
				"participant_id": part[:idx],
				"amount_cents":   parseDollars(part[idx+1:]),
			})
		}
	default:
		fatalf("--split-type must be equal or exact")
	}

	exp := doObj("POST", groupPath(token, "/expenses"), map[string]any{
		"paid_by_id":   *paidBy,
		"description":  *desc,
		"amount_cents": amount,
		"currency":     *currency,
		"date":         date.Format(time.RFC3339),
		"split_type":   *splitType,
		"splits":       splitInputs,
	})
	fmt.Printf("created expense  record_id: %s  desc: %s  amount: %s\n",
		sval(exp, "record_id"), sval(exp, "description"), dollars(exp, "amount_cents"))
}

func cmdExpenseDelete(args []string) {
	if len(args) < 2 {
		fatalf("usage: kt expense delete <token> <record-id>")
	}
	token, recordID := args[0], args[1]
	request("DELETE", groupPath(token, "/expenses/"+recordID), nil)
	fmt.Println("deleted")
}

func cmdBalances(args []string) {
	token := activeToken(args)
	result := doObj("GET", groupPath(token, "/balances"), nil)

	fmt.Println("Net balances:")
	w := newTable()
	fmt.Fprintln(w, "  PARTICIPANT\tNET")
	if pbs, ok := result["participant_balances"].([]any); ok {
		for _, item := range pbs {
			m := item.(map[string]any)
			net, _ := m["net_cents"].(float64)
			fmt.Fprintf(w, "  %s\t$%.2f\n", sval(m, "participant_name"), net/100)
		}
	}
	w.Flush()

	fmt.Println("\nSuggested settlements:")
	w2 := newTable()
	fmt.Fprintln(w2, "  FROM\tTO\tAMOUNT")
	if ss, ok := result["suggested_settlements"].([]any); ok {
		for _, item := range ss {
			m := item.(map[string]any)
			fmt.Fprintf(w2, "  %s\t%s\t%s\n",
				sval(m, "from_participant_name"), sval(m, "to_participant_name"), dollars(m, "amount_cents"))
		}
	}
	w2.Flush()
}

func cmdSettlements(args []string) {
	token := activeToken(args)
	list := doArr("GET", groupPath(token, "/settlements"), nil)
	w := newTable()
	fmt.Fprintln(w, "ID\tAMOUNT\tDATE\tPAYER\tPAYEE\tNOTE")
	for _, item := range list {
		m := item.(map[string]any)
		date := sval(m, "date")
		if len(date) > 10 {
			date = date[:10]
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\t%s\n",
			sval(m, "id"), dollars(m, "amount_cents"), date,
			sval(m, "payer_id"), sval(m, "payee_id"), sval(m, "note"))
	}
	w.Flush()
}

func cmdSettle(args []string) {
	if len(args) < 1 {
		fatalf("usage: kt settle <token> --payer <pid> --payee <pid> --amount <dollars> [--note <text>]")
	}
	token := args[0]
	fs := flag.NewFlagSet("settle", flag.ExitOnError)
	payer := fs.String("payer", "", "payer participant ID (required)")
	payee := fs.String("payee", "", "payee participant ID (required)")
	amountStr := fs.String("amount", "", "amount in dollars (required)")
	currency := fs.String("currency", "USD", "currency code")
	dateStr := fs.String("date", time.Now().Format("2006-01-02"), "date YYYY-MM-DD")
	note := fs.String("note", "", "optional note")
	fs.Parse(args[1:]) //nolint

	if *payer == "" || *payee == "" || *amountStr == "" {
		fatalf("--payer, --payee, and --amount are required")
	}
	amount := parseDollars(*amountStr)
	date, err := time.Parse("2006-01-02", *dateStr)
	if err != nil {
		fatalf("invalid date, use YYYY-MM-DD")
	}

	s := doObj("POST", groupPath(token, "/settlements"), map[string]any{
		"payer_id":     *payer,
		"payee_id":     *payee,
		"amount_cents": amount,
		"currency":     *currency,
		"date":         date.Format(time.RFC3339),
		"note":         *note,
	})
	fmt.Printf("recorded settlement  id: %s  amount: %s\n", sval(s, "id"), dollars(s, "amount_cents"))
}

// ---- main ----

func printUsage() {
	fmt.Print(`kt — kuchenteilen CLI

Usage:
  kt [--server <url>] <command> [args]

Token management:
  set-token <token>                       save a group access token for subsequent commands

Groups:
  group create <name> [--desc <text>] [--currency USD]
  group get [<token>]
  group rotate [<token>]                  rotate access token (saves new token)

Participants:
  participants [<token>]                  list participants
  participant add <token> <name>
  participant delete <token> <participant-id>

Expenses:
  expenses [<token>]
  expense add <token> --paid-by <pid> --desc <text> --amount <dollars> \
    --split-type equal --participants pid1,pid2,pid3
    --split-type exact --splits pid1:40.00,pid2:20.00
  expense delete <token> <record-id>

Balances:
  balances [<token>]                      net per-participant balances + suggested settlements

Settlements:
  settlements [<token>]
  settle <token> --payer <pid> --payee <pid> --amount <dollars> [--note <text>]

Config: ~/.config/kuchenteilen.json
Default server: http://localhost:8080
If <token> is omitted, the saved token from set-token / group create is used.
`)
}

func main() {
	loadConfig()

	fs := flag.NewFlagSet("kt", flag.ExitOnError)
	server := fs.String("server", "", "override API server URL")
	fs.Usage = printUsage
	fs.Parse(os.Args[1:]) //nolint
	if *server != "" {
		cfg.Server = *server
	}

	args := fs.Args()
	if len(args) == 0 {
		printUsage()
		os.Exit(0)
	}

	cmd, rest := args[0], args[1:]
	switch cmd {
	case "help":
		printUsage()
	case "set-token":
		cmdSetToken(rest)
	case "group":
		if len(rest) == 0 {
			fatalf("usage: kt group <create|get|rotate> ...")
		}
		switch rest[0] {
		case "create":
			cmdGroupCreate(rest[1:])
		case "get":
			cmdGroupGet(rest[1:])
		case "rotate":
			cmdGroupRotate(rest[1:])
		default:
			fatalf("unknown subcommand: group %s", rest[0])
		}
	case "participants":
		cmdParticipants(rest)
	case "participant":
		if len(rest) == 0 {
			fatalf("usage: kt participant <add|delete> ...")
		}
		switch rest[0] {
		case "add":
			cmdParticipantAdd(rest[1:])
		case "delete":
			cmdParticipantDelete(rest[1:])
		default:
			fatalf("unknown subcommand: participant %s", rest[0])
		}
	case "expenses":
		cmdExpenses(rest)
	case "expense":
		if len(rest) == 0 {
			fatalf("usage: kt expense <add|delete> ...")
		}
		switch rest[0] {
		case "add":
			cmdExpenseAdd(rest[1:])
		case "delete":
			cmdExpenseDelete(rest[1:])
		default:
			fatalf("unknown subcommand: expense %s", rest[0])
		}
	case "balances":
		cmdBalances(rest)
	case "settlements":
		cmdSettlements(rest)
	case "settle":
		cmdSettle(rest)
	default:
		fatalf("unknown command %q — run 'kt help' for usage", cmd)
	}
}
