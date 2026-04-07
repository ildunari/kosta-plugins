#!/usr/bin/env python3
"""
generate_api_client.py
----------------------
Generate a Swift API client from an OpenAPI 3.x spec (JSON or YAML).

- Async/await URLSession
- Optional Bearer auth hook
- Endpoints from paths + methods (operationId when present)
- Simple Codable model generation for object schemas

This is a bootstrap generator meant to produce high-quality starting code.
"""
import argparse, json, os, re, sys, datetime as dt
from typing import Any, Dict, List

try:
    import yaml  # type: ignore
    HAS_YAML = True
except Exception:
    HAS_YAML = False

def load_spec(path: str) -> Dict[str, Any]:
    ext = os.path.splitext(path)[1].lower()
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read()
    if ext in ('.yaml', '.yml'):
        if not HAS_YAML:
            raise SystemExit("YAML requested but PyYAML not installed. Install with `pip install pyyaml`, or provide JSON.")
        return yaml.safe_load(raw)  # type: ignore
    return json.loads(raw)

def sanitize_name(s: str) -> str:
    s = re.sub(r'[^A-Za-z0-9_]+', '_', s)
    if s and s[0].isdigit():
        s = '_' + s
    return s

def swift_type(schema: Dict[str, Any]) -> str:
    if not schema: return "Decodable"
    if '$ref' in schema:
        return sanitize_name(schema['$ref'].split('/')[-1])
    t = schema.get('type', 'object')
    if t == 'integer': return 'Int'
    if t == 'number': return 'Double'
    if t == 'boolean': return 'Bool'
    if t == 'string': return 'String'
    if t == 'array': return f'[{swift_type(schema.get("items", {}))}]'
    return 'Decodable'

def make_model(name: str, schema: Dict[str, Any]) -> str:
    props = (schema or {}).get('properties', {}) or {}
    req = set((schema or {}).get('required', []) or [])
    lines = [f'public struct {sanitize_name(name)}: Codable {{']
    if not props:
        lines += ['    public init() {}', '}']
        return '\n'.join(lines)
    for pname, pschema in props.items():
        ty = swift_type(pschema)
        opt = '' if pname in req else '?'
        lines.append(f'    public var {sanitize_name(pname)}: {ty}{opt}')
    # init
    params = []
    for pname, pschema in props.items():
        ty = swift_type(pschema)
        if pname in req:
            params.append(f'{sanitize_name(pname)}: {ty}')
        else:
            params.append(f'{sanitize_name(pname)}: {ty}? = nil')
    lines.append(f'    public init({", ".join(params)}) {{')
    for pname in props.keys():
        lines.append(f'        self.{sanitize_name(pname)} = {sanitize_name(pname)}')
    lines.append('    }')
    lines.append('}')
    return '\n'.join(lines)

def write_client(spec: Dict[str, Any], module: str, out_dir: str, auth: str):
    os.makedirs(out_dir, exist_ok=True)
    base_url = (spec.get('servers') or [{'url': 'https://api.example.com'}])[0]['url']
    base = f"""// GENERATED: {dt.datetime.utcnow().isoformat()}Z
import Foundation

public struct RequestOptions {{
    public var headers: [String:String] = [:]
    public var query: [String:String?] = [:]
    public init() {{ }}
}}

public final class {module}Client {{
    public let baseURL: URL
    public let session: URLSession
    public var defaultHeaders: [String:String] = ["Accept":"application/json"]
    public var jsonDecoder: JSONDecoder = JSONDecoder()
    public var jsonEncoder: JSONEncoder = JSONEncoder()
    public var authTokenProvider: (() async -> String?)? = nil

    public init(baseURL: URL = URL(string: "{base_url}")!, session: URLSession = .shared) {{
        self.baseURL = baseURL
        self.session = session
        jsonDecoder.dateDecodingStrategy = .iso8601
        jsonEncoder.dateEncodingStrategy = .iso8601
    }}

    private func makeRequest(method: String, path: String, bodyData: Data?, options: RequestOptions) async throws -> URLRequest {{
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !options.query.isEmpty {{
            components.queryItems = options.query.map {{ URLQueryItem(name: $0.key, value: $0.value) }}
        }}
        guard let url = components.url else {{ throw URLError(.badURL) }}
        var req = URLRequest(url: url)
        req.httpMethod = method.uppercased()
        var headers = defaultHeaders.merging(options.headers) {{ _, r in r }}
        if let token = {( 'await authTokenProvider?()' if auth == 'bearer' else 'nil' )} {{
            headers["Authorization"] = "Bearer \\(token)"
        }}
        for (k,v) in headers {{ req.setValue(v, forHTTPHeaderField: k) }}
        if let bodyData = bodyData {{
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = bodyData
        }}
        return req
    }}

    private func sendCore<T: Decodable>(_ req: URLRequest, expect: T.Type) async throws -> T {{
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse else {{ throw URLError(.badServerResponse) }}
        if (200..<300).contains(http.statusCode) {{
            if T.self is EmptyResponse.Type {{ return EmptyResponse() as! T }}
            return try jsonDecoder.decode(T.self, from: data)
        }} else {{
            if let ct = http.value(forHTTPHeaderField: "Content-Type"),
               ct.contains("application/problem+json"),
               let prob = try? jsonDecoder.decode(ProblemDetails.self, from: data) {{
                throw APIError.http(status: http.statusCode, problem: prob, data: data)
            }}
            throw APIError.http(status: http.statusCode, problem: nil, data: data)
        }}
    }}

    public func send<T: Decodable>(_ method: String, path: String, expect: T.Type = T.self, options: RequestOptions = .init()) async throws -> T {{
        let req = try await makeRequest(method: method, path: path, bodyData: nil, options: options)
        return try await sendCore(req, expect: expect)
    }}

    public func send<T: Decodable, B: Encodable>(_ method: String, path: String, body: B, expect: T.Type = T.self, options: RequestOptions = .init()) async throws -> T {{
        let data = try jsonEncoder.encode(body)
        let req = try await makeRequest(method: method, path: path, bodyData: data, options: options)
        return try await sendCore(req, expect: expect)
    }}
}}

public struct ProblemDetails: Codable, Error {{ public var type: String?; public var title: String?; public var status: Int?; public var detail: String?; public var instance: String? }}
public enum APIError: Error {{ case http(status: Int, problem: ProblemDetails?, data: Data) }}
public struct EmptyResponse: Codable {{ public init() {{}} }}
"""
    with open(os.path.join(out_dir, f"{module}Client.swift"), "w", encoding="utf-8") as f:
        f.write(base)

    # models
    models = []
    for name, schema in (spec.get('components', {}).get('schemas', {}) or {}).items():
        if 'properties' in (schema or {}):
            models.append(make_model(name, schema))
    if models:
        with open(os.path.join(out_dir, "Models.swift"), "w", encoding="utf-8") as f:
            f.write("// GENERATED MODELS\\nimport Foundation\\n\\n" + "\\n\\n".join(models))

    # endpoints
    ext = [f'// GENERATED ENDPOINTS {dt.datetime.utcnow().isoformat()}Z', 'import Foundation', f'extension {module}Client {{']
    paths = spec.get('paths') or {}
    for path, path_item in paths.items():
        for method in ["get","post","put","patch","delete","head","options"]:
            op = (path_item or {}).get(method)
            if not op: continue
            op_id = op.get('operationId') or f"{method}_{path}".replace('/','_').replace('{','').replace('}','')
            func = sanitize_name(op_id)
            # result type
            ok_schema = None
            for code, resp in (op.get('responses') or {}).items():
                if str(code).startswith('2'):
                    ok_schema = ((resp.get('content') or {}).get('application/json') or {}).get('schema')
                    break
            return_type = swift_type(ok_schema or {})
            # params
            params = op.get('parameters', []) or []
            p_path = [p for p in params if p.get('in') == 'path']
            p_query = [p for p in params if p.get('in') == 'query']
            p_header = [p for p in params if p.get('in') == 'header']
            args = []
            for p in p_path:
                args.append(f"{sanitize_name(p['name'])}: String")
            for p in p_query:
                args.append(f"{sanitize_name(p['name'])}: String = \"\"")
            if p_header:
                args.append("headers: [String:String] = [:]")
            # request body
            body_decl = ""
            if 'requestBody' in op:
                content = (op['requestBody'].get('content') or {}).get('application/json', {})
                body_decl = f"body: {swift_type(content.get('schema') or {})}, "
            # swift path with interpolation
            spath = path
            for p in p_path:
                nm = sanitize_name(p['name'])
                spath = spath.replace("{"+p['name']+"}", f"\\\\({nm})")
            # query dict
            if p_query:
                q_items = ", ".join([f'"{p["name"]}": {sanitize_name(p["name"])}.isEmpty ? nil : {sanitize_name(p["name"])}' for p in p_query])
            else:
                q_items = ""
            # function body
            ext.append(f"    public func {func}({body_decl}{', '.join(args)}) async throws -> {return_type} {{")
            ext.append(f"        var opts = RequestOptions()")
            if p_query:
                ext.append(f"        opts.query = [{q_items}]")
            if p_header:
                ext.append(f"        opts.headers = headers")
            if 'requestBody' in op:
                ext.append(f'        return try await send("{method}", path: "{spath}", body: body, expect: {return_type}.self, options: opts)')
            else:
                ext.append(f'        return try await send("{method}", path: "{spath}", expect: {return_type}.self, options: opts)')
            ext.append("    }")
    ext.append("}")
    with open(os.path.join(out_dir, "Endpoints.swift"), "w", encoding="utf-8") as f:
        f.write("\n".join(ext))

def main():
    ap = argparse.ArgumentParser(description="Generate a Swift API client from an OpenAPI spec.")
    ap.add_argument("spec", help="Path to OpenAPI spec (JSON or YAML)")
    ap.add_argument("--module", default="GeneratedAPI", help="Swift module/class prefix")
    ap.add_argument("--out", default="swift/Generated", help="Output directory for Swift files")
    ap.add_argument("--auth", choices=["none","bearer"], default="none", help="Auth style (adds token provider hook)")
    args = ap.parse_args()
    spec = load_spec(args.spec)
    out_dir = args.out
    os.makedirs(out_dir, exist_ok=True)
    write_client(spec, args.module, out_dir, args.auth)
    print(f"[ok] Generated client for {args.module} at {out_dir}")

if __name__ == "__main__":
    main()
